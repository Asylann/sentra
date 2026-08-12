//go:build ignore

package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
)

func main() {
	secret := "test_secret"
	payload := []byte(`{
		"action": "opened",
		"number": 1,
		"pull_request": {"number": 1},
		"repository": {
			"id": 12345,
			"full_name": "test/repo",
			"private": false,
			"owner": {
				"login": "test",
				"id": 111,
				"type": "User"
			}
		},
		"installation": {"id": 999},
		"sender": {"login": "test"}
	}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	signature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	req, _ := http.NewRequest("POST", "http://localhost:8001/webhook", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-GitHub-Delivery", "a2c1e5a0-0b1a-11ec-8f8d-0242ac130005")
	req.Header.Set("X-GitHub-Event", "pull_request")
	req.Header.Set("X-Hub-Signature-256", signature)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("Status: %v\n", resp.Status)
}
