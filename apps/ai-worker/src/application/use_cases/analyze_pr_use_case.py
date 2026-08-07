import asyncio
import logging
from typing import Dict, Any

from src.infrastructure.github.client import GitHubClient
from src.infrastructure.github.check_runs import GitHubCheckRunsAPI
from src.application.services.noise_filter import DiffNoiseFilter
from src.application.services.ast_pruner import ASTContextPruner
from src.infrastructure.database.rag_repository import RAGRepository
from src.application.services.context_builder import RAGContextBuilder
from src.infrastructure.llm.bedrock_client import BedrockClaudeClient
from src.application.services.deterministic_scanner import DeterministicScanner
from src.application.services.quality_scorer import QualityScorer
from src.infrastructure.redis.redis_publisher import RedisPublisher
from sqlalchemy.ext.asyncio import async_sessionmaker
from src.infrastructure.database.models import Organization, Repository, Developer, PullRequest, ReviewFinding
from sqlalchemy.dialects.postgresql import insert
import hashlib

logger = logging.getLogger(__name__)

class AnalyzePRUseCase:
    """
    Application layer Use Case for analyzing a Pull Request.
    The ultimate orchestrator wiring the complete DevSecOps AI pipeline.
    """
    def __init__(
        self, 
        github_client: GitHubClient, 
        check_runs_api: GitHubCheckRunsAPI,
        rag_repo: RAGRepository, 
        bedrock_client: BedrockClaudeClient,
        redis_publisher: RedisPublisher,
        db_session_factory: async_sessionmaker
    ):
        self.github_client = github_client
        self.check_runs_api = check_runs_api
        self.rag_repo = rag_repo
        self.bedrock_client = bedrock_client
        self.redis_publisher = redis_publisher
        self.db_session_factory = db_session_factory

    async def execute(self, payload: Dict[str, Any]):
        repo_id = payload.get("repository", {}).get("id", "unknown")
        repo_full_name = payload.get("repository", {}).get("full_name", "unknown")
        pr_number = payload.get("pull_request", {}).get("number")
        sender_login = payload.get("sender", {}).get("login", "unknown")
        sender_id = payload.get("sender", {}).get("id")
        installation_id = payload.get("installation", {}).get("id")
        
        org_id = payload.get("organization", {}).get("id")
        org_login = payload.get("organization", {}).get("login")
        
        # Fallback to repository owner if organization is not present (personal repos)
        if not org_id:
            org_id = payload.get("repository", {}).get("owner", {}).get("id")
            org_login = payload.get("repository", {}).get("owner", {}).get("login")
        
        pr_title = payload.get("pull_request", {}).get("title", "")
        pr_body = payload.get("pull_request", {}).get("body", "")
        pr_state = payload.get("pull_request", {}).get("state", "open")
        base_branch = payload.get("pull_request", {}).get("base", {}).get("ref", "unknown")
        head_branch = payload.get("pull_request", {}).get("head", {}).get("ref", "unknown")
        base_sha = payload.get("pull_request", {}).get("base", {}).get("sha", "unknown")
        
        # We need the head SHA to create the check run
        head_sha = payload.get("pull_request", {}).get("head", {}).get("sha", "")
        if not head_sha and "head" in payload:
            head_sha = payload["head"].get("sha", "")
            
        if not pr_number and "number" in payload:
             pr_number = payload["number"]

        action = payload.get("action", "unknown")
        logger.info(f"Starting PR analysis for {repo_full_name}#{pr_number}, action={action}")

        if not repo_full_name or not pr_number or not head_sha or repo_full_name == "unknown":
            logger.error("Missing repository full_name, pull_request number, or head_sha in payload")
            return

        if not installation_id:
            logger.error("Missing installation_id in payload, cannot authenticate as GitHub App")
            return

        # Step 1: Create GitHub Check Run (in_progress)
        check_run_id = await self.check_runs_api.create_check_run(repo_full_name, head_sha, installation_id)
        all_findings = []
        
        # Publish "analyzing" status to Redis Pub/Sub
        github_user_id = payload.get("sender", {}).get("id")
        if github_user_id:
            channel = f"user:{github_user_id}:pr_events"
            await self.redis_publisher.publish(channel, {
                "status": "analyzing",
                "pr_number": pr_number,
                "repo": repo_full_name
            })

        try:
            # Step 2: Fetch Git Diff
            logger.info(f"Step 2: Fetching Git Diff from {repo_full_name}#{pr_number}")
            raw_diff = await self.github_client.fetch_pull_request_diff(repo_full_name, pr_number, installation_id)

            # Step 3: Noise Filtering
            logger.info("Step 3: Filtering Noise")
            parsed_files = self._parse_raw_diff(raw_diff)
            pruned_diff = DiffNoiseFilter.filter_diff(repo_id, pr_number, parsed_files)
            
            # Step 4: Run Deterministic Scanner (Level 1)
            logger.info("Step 4: Running Level 1 Deterministic Scanner")
            level_1_findings = DeterministicScanner.scan_diff(pruned_diff)
            all_findings.extend(level_1_findings)

            # Step 5: Semantic AST Context Pruning (with real file content)
            # ─────────────────────────────────────────────────────────────
            # CRITICAL: A unified diff only contains ±3 lines of context around
            # each hunk. Variables defined at line 15 are completely absent from
            # a diff whose changes start at line 156.
            #
            # We resolve this by fetching the full file content for each modified
            # file and passing it to the Semantic Dependency Resolver so it can
            # scan the actual top-100 lines for imports and global constants.
            #
            # All fetches run concurrently (asyncio.gather) to minimise latency.
            logger.info("Step 5: Semantic AST Context Pruning — fetching full file content")

            # 5a: Identify files that need pruning
            actionable_files = [
                f for f in pruned_diff.files if not f.was_excluded and f.raw_patch
            ]

            # 5b: Fetch full content for every actionable file — concurrently.
            #     return_exceptions=True means one failing fetch doesn't abort others.
            fetch_tasks = [
                self.github_client.fetch_raw_file_content(
                    repo_full_name, f.filename, head_sha, installation_id
                )
                for f in actionable_files
            ]
            fetch_results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

            # Build filename → content map; log any per-file failures.
            content_map: dict = {}
            for af, result in zip(actionable_files, fetch_results):
                if isinstance(result, Exception):
                    logger.warning(
                        "Could not fetch full content for %s (will use diff-only context): %s",
                        af.filename, result,
                    )
                    content_map[af.filename] = None
                else:
                    content_map[af.filename] = result  # str or None

            # 5c: Prune each file, now with real file content for dependency resolution
            for f in pruned_diff.files:
                if not f.was_excluded and f.raw_patch:
                    try:
                        f.raw_patch = ASTContextPruner.prune_patch(
                            f.raw_patch,
                            file_content=content_map.get(f.filename),
                            context_lines=10,
                        )
                    except Exception as e:
                        logger.warning(
                            "AST pruning failed for %s, falling back to raw patch: %s",
                            f.filename, e,
                        )

            
            final_diff_prompt = pruned_diff.final_prompt_string
            
            if final_diff_prompt.strip():
                # Step 6: RAG Context Retrieval
                logger.info("Step 6: Retrieving RAG Context (Policies & Developer Metrics)")
                policies = await self.rag_repo.get_relevant_policies(repo_id, final_diff_prompt)
                dev_metrics = await self.rag_repo.get_developer_metrics(sender_login)
                system_prompt = RAGContextBuilder.assemble_full_rag_context(policies, dev_metrics)
                
                # Step 7: AWS Bedrock Claude 3 Inference (Level 2)
                logger.info("Step 7: Executing AWS Bedrock Claude 3.5 Sonnet Inference")
                llm_findings = await self.bedrock_client.analyze_diff(system_prompt, final_diff_prompt)
                all_findings.extend(llm_findings)
            else:
                logger.info("No actionable code changes found after pruning. Skipping LLM analysis.")

            # Step 8: Aggregate and Score
            logger.info("Step 8: Calculating Final Quality Score")
            quality_score, conclusion = QualityScorer.evaluate(all_findings)

            counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
            for f in all_findings:
                sev = f.get("severity", "INFO").upper()
                counts[sev] = counts.get(sev, 0) + 1

            score_emoji = "🟢" if quality_score >= 90 else ("🟡" if quality_score >= 70 else "🔴")
            conclusion_badge = "✅ **Passed**" if conclusion == "success" else "❌ **Failed**"

            summary = (
                f"## Sentra AI Security Review\n\n"
                f"| | |\n"
                f"|---|---|\n"
                f"| **Quality Score** | {score_emoji} **{quality_score}/100** |\n"
                f"| **Gate** | {conclusion_badge} |\n"
                f"| **Total Findings** | {len(all_findings)} |\n\n"
                f"### Findings Breakdown\n\n"
                f"| Severity | Count |\n"
                f"|---|---|\n"
                f"| 🔴 Critical | {counts['CRITICAL']} |\n"
                f"| 🟠 High | {counts['HIGH']} |\n"
                f"| 🟡 Medium | {counts['MEDIUM']} |\n"
                f"| 🔵 Low | {counts['LOW']} |\n"
                f"| ⚪ Info | {counts['INFO']} |\n"
            )

            # Step 9: Complete Check Run
            logger.info("Step 9: Completing Check Run and Posting Annotations")
            await self.check_runs_api.complete_check_run(
                repo_full_name, check_run_id, conclusion, summary, all_findings, installation_id
            )
            
            # (Note: Redis "completed" publish moved to Step 11 after DB persistence)
            
            # Step 10: Persist to Postgres
            logger.info("Step 10: Persisting analysis results to Postgres Database")
            async with self.db_session_factory() as session:
                async with session.begin():
                    # 10.1 Upsert Organization
                    if org_id and org_login:
                        org_stmt = insert(Organization).values(
                            github_id=org_id,
                            login=org_login,
                            installation_id=installation_id
                        ).on_conflict_do_update(
                            index_elements=['github_id'],
                            set_=dict(login=org_login)
                        ).returning(Organization.id)
                        org_pk = await session.scalar(org_stmt)
                    else:
                        org_pk = None

                    # 10.2 Upsert Developer
                    dev_pk = None
                    if sender_id and sender_login:
                        dev_stmt = insert(Developer).values(
                            github_id=sender_id,
                            login=sender_login
                        ).on_conflict_do_update(
                            index_elements=['github_id'],
                            set_=dict(login=sender_login)
                        ).returning(Developer.id)
                        dev_pk = await session.scalar(dev_stmt)

                    # 10.3 Upsert Repository
                    if repo_id and org_pk:
                        repo_stmt = insert(Repository).values(
                            github_id=repo_id,
                            organization_id=org_pk,
                            name=repo_full_name.split('/')[-1],
                            full_name=repo_full_name
                        ).on_conflict_do_update(
                            index_elements=['github_id'],
                            set_=dict(full_name=repo_full_name)
                        ).returning(Repository.id)
                        repo_pk = await session.scalar(repo_stmt)
                    else:
                        repo_pk = None

                    # 10.4 Insert Pull Request
                    if org_pk and repo_pk:
                        new_pr = PullRequest(
                            github_pr_id=pr_number,  # Using PR number as github_pr_id placeholder if real id not found
                            repository_id=repo_pk,
                            organization_id=org_pk,
                            pull_number=pr_number,
                            title=pr_title,
                            body=pr_body,
                            author_id=dev_pk,
                            author_login=sender_login,
                            base_branch=base_branch,
                            head_branch=head_branch,
                            head_sha=head_sha,
                            base_sha=base_sha,
                            state=pr_state,
                            analysis_status="completed",
                            quality_score=quality_score,
                            check_run_id=check_run_id,
                            check_run_conclusion=conclusion,
                            findings_critical=sum(1 for f in all_findings if f.get('severity') == 'CRITICAL'),
                            findings_high=sum(1 for f in all_findings if f.get('severity') == 'HIGH'),
                            findings_medium=sum(1 for f in all_findings if f.get('severity') == 'MEDIUM'),
                            findings_low=sum(1 for f in all_findings if f.get('severity') == 'LOW'),
                            findings_info=sum(1 for f in all_findings if f.get('severity') == 'INFO'),
                            model_id=self.bedrock_client.model_id
                        )
                        session.add(new_pr)
                        await session.flush()
                        
                        # 10.5 Insert Findings
                        for finding in all_findings:
                            fp_str = f"{finding.get('file_path')}:{finding.get('line_start')}:{finding.get('title')}"
                            fingerprint = hashlib.sha256(fp_str.encode()).hexdigest()
                            
                            new_finding = ReviewFinding(
                                pull_request_id=new_pr.id,
                                repository_id=repo_pk,
                                organization_id=org_pk,
                                file_path=finding.get('file_path', 'unknown'),
                                line_start=finding.get('line_start', 0),
                                line_end=finding.get('line_start', 0),
                                category=finding.get('category', 'Bug'),
                                severity=finding.get('severity', 'INFO'),
                                title=finding.get('title', 'Unknown Issue'),
                                description=finding.get('description', ''),
                                suggested_fix=finding.get('suggested_fix'),
                                fingerprint=fingerprint
                            )
                            session.add(new_finding)
                            
            # Publish "completed" status to Redis Pub/Sub WITH real PR ID
            if github_user_id and 'new_pr' in locals():
                channel = f"user:{github_user_id}:pr_events"
                await self.redis_publisher.publish(channel, {
                    "id": str(new_pr.id), # Now we have the DB generated ID!
                    "status": "completed",
                    "pr_number": pr_number,
                    "repo": repo_full_name,
                    "quality_score": quality_score,
                    "finding_count": len(all_findings),
                    "conclusion": conclusion
                })

            logger.info(f"PR Analysis Pipeline finished successfully (QS: {quality_score}, Conclusion: {conclusion}).")

        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            if check_run_id:
                await self.check_runs_api.complete_check_run(
                    repo_full_name, check_run_id, "failure", f"Analysis failed due to internal error: {e}", [], installation_id
                )
            raise

    def _parse_raw_diff(self, raw_diff: str) -> list:
        """
        Rudimentary unified diff parser to extract files and patches.
        """
        files = []
        current_file = None
        current_patch = []
        
        for line in raw_diff.split('\n'):
            if line.startswith('diff --git'):
                if current_file:
                    files.append({
                        'filename': current_file,
                        'status': 'modified',
                        'patch': '\n'.join(current_patch)
                    })
                parts = line.split(' ')
                if len(parts) >= 3:
                    current_file = parts[2][2:] # strip a/
                else:
                    current_file = "unknown"
                current_patch = []
            elif current_file:
                current_patch.append(line)
                
        if current_file:
            files.append({
                'filename': current_file,
                'status': 'modified',
                'patch': '\n'.join(current_patch)
            })
            
        return files
