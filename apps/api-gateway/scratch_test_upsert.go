//go:build ignore

package main

import (
	"context"
	"fmt"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/usena/sentra/api-gateway/internal/db"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, "postgres://sentra:sentra_dev_password_change_in_prod@localhost:5432/sentra")
	if err != nil {
		fmt.Printf("Unable to connect to database: %v\n", err)
		return
	}
	defer pool.Close()

	q := db.New(pool)
	
	id, err := q.UpsertOrganization(ctx, db.UpsertOrganizationParams{
		GithubID:       99999999,
		Login:          "testorg",
		Type:           "Organization",
		InstallationID: 88888888,
	})
	if err != nil {
		fmt.Printf("UpsertOrganization failed: %v\n", err)
		return
	}
	fmt.Printf("UpsertOrganization success, ID: %d\n", id)

	repoID, err := q.UpsertRepository(ctx, db.UpsertRepositoryParams{
		GithubID:       77777777,
		OrganizationID: id,
		FullName:       "testorg/testrepo",
		IsPrivate:      false,
	})
	if err != nil {
		fmt.Printf("UpsertRepository failed: %v\n", err)
		return
	}
	fmt.Printf("UpsertRepository success, ID: %d\n", repoID)
}
