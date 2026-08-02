import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// SVG ICONS (Preserved exactly from HTML)
// ============================================================================
const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" data-slot="icon" className="h-3.5 w-3.5 shrink-0">
    <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z"></path>
    <path d="m3.265 10.602 7.668 4.129a2.25 2.25 0 0 0 2.134 0l7.668-4.13 1.37.739a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.71 0l-9.75-5.25a.75.75 0 0 1 0-1.32l1.37-.738Z"></path>
    <path d="m10.933 19.231-7.668-4.13-1.37.739a.75.75 0 0 0 0 1.32l9.75 5.25c.221.12.489.12.71 0l9.75-5.25a.75.75 0 0 0 0-1.32l-1.37-.738-7.668 4.13a2.25 2.25 0 0 1-2.134-.001Z"></path>
  </svg>
);

const FilesIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.4"></circle>
    <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"></path>
  </svg>
);

const SidebarToggleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="size-4">
    <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"></rect>
    <rect x="4" y="5" height="6" rx="0.75" fill="currentColor" className="transition-[width] duration-300 ease-cui-out-expo [width:4px] group-hover/btn:[width:2.5px] motion-reduce:transition-none"></rect>
  </svg>
);

const OverviewIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" data-layer-row-icon="overview" className="h-3 w-3 text-[#c084fc]">
    <path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z"></path>
    <path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z"></path>
    <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z"></path>
  </svg>
);

const BlastRadiusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" data-layer-row-icon="blast-radius" className="h-3 w-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5 3.5 4.88-2.44c.38-.19.62-.58.62-1V4.82c0-.84-.88-1.38-1.63-1.01L15.5 5.75c-.32.16-.69.16-1.01 0L9.5 3.25c-.32-.16-.69-.16-1.01 0L3.62 5.69c-.38.19-.62.58-.62 1v12.49c0 .84.88 1.38 1.63 1.01L8.5 18.25c.32-.16.69-.16 1.01 0l4.99 2.5c.32.16.69.16 1 0Z"></path>
  </svg>
);

const ArchitectureImpactIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" data-layer-row-icon="architecture-impact" className="h-3 w-3">
    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z"></path>
    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z"></path>
    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z"></path>
    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z"></path>
  </svg>
);

const ComplexityIconSvg = ({ colorClass }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" data-slot="icon" data-layer-complexity-icon="medium" className={`h-3 w-3 opacity-70 ${colorClass}`}>
    <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd"></path>
    <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"></path>
  </svg>
);

// ============================================================================
// COMPONENTS
// ============================================================================

export function SidebarHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 rounded-[0.35rem] border border-[var(--color-cui-mauve-5)] bg-[var(--color-cui-mauve-1)] p-0.5">
        <button 
          type="button" 
          aria-pressed="true"
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.25rem] px-2 text-[0.75rem] font-medium transition-[background-color,color,transform] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f04006] active:scale-[0.98] bg-[#25232a] text-[#f4f1f5] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
        >
          <LayersIcon />
          <span className="shrink-0 whitespace-nowrap">Layers</span>
        </button>
        <div className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.25rem] px-2 text-[0.75rem] font-medium transition-[background-color,color,transform] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f04006] cursor-default text-[#85818d] hover:bg-[#1d1b21] hover:text-[#d6d0d7]">
          <FilesIcon />
          <span className="truncate">Files</span>
        </div>
      </div>
      <div 
        aria-label="Toggle compact sidebar" 
        title="Toggle compact sidebar"
        className="group/btn flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.25rem] border text-[#b5afba] transition-[background-color,border-color,color,transform] duration-150 ease-out hover:text-white cursor-default border-transparent bg-transparent hover:border-[#34303a] hover:bg-[#1c1a20]"
      >
        <SidebarToggleIcon />
      </div>
    </div>
  );
}

export function SidebarSectionItem({ title, subtitle, icon, delay }) {
  return (
    <motion.div 
      aria-label={`${title}${subtitle ? ` - ${subtitle}` : ''}`}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group flex min-h-8 min-w-0 items-start gap-2 overflow-hidden rounded-md p-1.5 text-left transition-[background-color,transform] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f04006] hover:bg-[#19171d] cursor-default"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.25rem] bg-[#1b1920] text-[#d7d1dc]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold leading-5 text-[#eee9f0]">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[0.75rem] leading-4 text-[#aaa3ae]">{subtitle}</span>}
      </span>
    </motion.div>
  );
}

export function ComplexityBadge({ count, iconColorClass, containerClass }) {
  return (
    <span className={`inline-flex h-5 min-w-7 items-center justify-center gap-1 rounded-full border px-1.5 text-[0.625rem] font-semibold leading-none tabular-nums ${containerClass}`}>
      <ComplexityIconSvg colorClass={iconColorClass} />
      {count}
    </span>
  );
}

export function DotBadge({ count, dotColorClass, containerClass }) {
  return (
    <span className={`inline-flex h-5 min-w-7 items-center justify-center gap-1 rounded-full border px-1.5 text-[0.625rem] font-semibold leading-none tabular-nums ${containerClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColorClass}`}></span>
      {count}
    </span>
  );
}

export function SidebarLayerItem({ layerNumber, title, isActive, children, delay }) {
  const baseClasses = "group flex min-h-8 min-w-0 items-start gap-2 overflow-hidden rounded-md p-1.5 text-left transition-[background-color,transform] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f04006] active:scale-[0.99]";
  const stateClasses = isActive ? "bg-[#25232a]" : "hover:bg-[#19171d]";

  return (
    <motion.button 
      type="button" 
      aria-label={`Layer ${layerNumber}: ${title}`}
      aria-pressed={isActive ? "true" : "false"}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`${baseClasses} ${stateClasses}`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.25rem] bg-[#1b1920] text-[0.625rem] font-semibold text-[#d7d1dc]">
        {layerNumber}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold leading-5 text-[#eee9f0]">{title}</span>
        <span className="mt-1.5 flex min-w-0 flex-wrap gap-1.5">
          {children}
        </span>
      </span>
    </motion.button>
  );
}

export default function ReviewSidebar() {
  return (
    <aside
      aria-label="Review stack layers and files"
      className="flex h-full min-h-0 w-64 min-w-64 shrink-0 flex-col overflow-hidden p-2 HomeHero-module__cJy2da__reviewStackSidebar bg-[#0a0a0a]"
    >
      <SidebarHeader />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden pr-1">
        <SidebarSectionItem
          title="Overview"
          subtitle="Not mergeable · 3 blockers"
          icon={<OverviewIcon />}
          delay={0.1}
        />
        <SidebarSectionItem
          title="Blast radius"
          icon={<BlastRadiusIcon />}
          delay={0.15}
        />
        <SidebarSectionItem
          title="Architecture impact"
          icon={<ArchitectureImpactIcon />}
          delay={0.2}
        />
        
        <div aria-hidden="true" className="my-1 border-t border-[#34303a]"></div>
        
        <SidebarLayerItem
          layerNumber="1"
          title="Add the invitation data model"
          isActive={true}
          delay={0.25}
        >
          <ComplexityBadge 
            count="2" 
            iconColorClass="text-[var(--color-cui-mauve-8)]" 
            containerClass="border-[var(--color-cui-mauve-8)]/45 bg-[var(--color-cui-mauve-8)]/15 text-[var(--color-cui-mauve-11)]" 
          />
        </SidebarLayerItem>
        
        <SidebarLayerItem
          layerNumber="2"
          title="Add the invitation API and emails"
          isActive={false}
          delay={0.3}
        >
          <ComplexityBadge 
            count="3" 
            iconColorClass="text-cui-warn" 
            containerClass="border-cui-warn bg-cui-warn-subtle text-cui-warn" 
          />
          <DotBadge 
            count="1" 
            dotColorClass="bg-[#f97316]" 
            containerClass="border-cui-danger bg-cui-danger-subtle text-cui-danger" 
          />
          <DotBadge 
            count="1" 
            dotColorClass="bg-[#f97316]" 
            containerClass="border-cui-accent bg-cui-accent-subtle text-cui-accent" 
          />
        </SidebarLayerItem>
        
        <SidebarLayerItem
          layerNumber="3"
          title="Build the invite & members UI"
          isActive={false}
          delay={0.35}
        >
          <ComplexityBadge 
            count="4" 
            iconColorClass="text-[var(--color-cui-mauve-8)]" 
            containerClass="border-[var(--color-cui-mauve-8)]/45 bg-[var(--color-cui-mauve-8)]/15 text-[var(--color-cui-mauve-11)]" 
          />
        </SidebarLayerItem>
      </div>
    </aside>
  );
}
