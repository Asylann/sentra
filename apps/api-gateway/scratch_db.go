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

	fmt.Println("--- LATEST WEBHOOK PAYLOADS ---")
	rows, err := conn.Query(ctx, "SELECT id, event_type, action, installation_id, organization_id, repository_id, received_at FROM webhook_payloads ORDER BY id DESC LIMIT 5")
	if err != nil {
		fmt.Printf("Query failed: %v\n", err)
	} else {
		for rows.Next() {
			var id int64
			var eventType string
			var action *string
			var installID int64
			var orgID *int64
			var repoID *int64
			var receivedAt time.Time
			rows.Scan(&id, &eventType, &action, &installID, &orgID, &repoID, &receivedAt)
			
			act := "NULL"
			if action != nil { act = *action }
			var org, repo string
			if orgID != nil { org = fmt.Sprintf("%d", *orgID) } else { org = "NULL" }
			if repoID != nil { repo = fmt.Sprintf("%d", *repoID) } else { repo = "NULL" }

			fmt.Printf("[%s] ID:%d Event:%s Action:%s Org:%s Repo:%s\n", receivedAt.Format(time.RFC3339), id, eventType, act, org, repo)
		}
		rows.Close()
	}

	fmt.Println("\n--- LATEST OUTBOX EVENTS ---")
	rows2, err := conn.Query(ctx, "SELECT id, aggregate_id, event_type, kafka_topic, created_at, status FROM outbox_events ORDER BY id DESC LIMIT 5")
	if err != nil {
		fmt.Printf("Query failed: %v\n", err)
	} else {
		for rows2.Next() {
			var id int64
			var aggID string
			var evtType string
			var topic string
			var created time.Time
			var status string
			rows2.Scan(&id, &aggID, &evtType, &topic, &created, &status)
			fmt.Printf("ID:%d AggID:%s Event:%s Topic:%s Status:%s CreatedAt:%v\n", id, aggID, evtType, topic, status, created)
		}
		rows2.Close()
	}
}
