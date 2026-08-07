package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := pgx.Connect(ctx, "postgres://sentra:sentra_dev_password_change_in_prod@localhost:5432/sentra")
	if err != nil {
		fmt.Printf("Unable to connect to database: %v\n", err)
		return
	}
	defer conn.Close(ctx)

	fmt.Println("--- ORGANIZATIONS ---")
	rows, _ := conn.Query(ctx, "SELECT id, github_id, login, installation_id FROM organizations ORDER BY id DESC")
	for rows.Next() {
		var id, githubID, installID int64
		var login string
		rows.Scan(&id, &githubID, &login, &installID)
		fmt.Printf("Org ID:%d GithubID:%d Login:%s Install:%d\n", id, githubID, login, installID)
	}
	rows.Close()

	fmt.Println("\n--- REPOSITORIES ---")
	rows2, _ := conn.Query(ctx, "SELECT id, github_id, organization_id, full_name FROM repositories ORDER BY id DESC")
	for rows2.Next() {
		var id, githubID, orgID int64
		var fullName string
		rows2.Scan(&id, &githubID, &orgID, &fullName)
		fmt.Printf("Repo ID:%d GithubID:%d OrgID:%d FullName:%s\n", id, githubID, orgID, fullName)
	}
	rows2.Close()
}
