//go:build ignore

package main

import (
	"fmt"
	"github.com/IBM/sarama"
)

func main() {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Idempotent = true
	config.Producer.Return.Successes = true
	config.Net.MaxOpenRequests = 1

	brokers := []string{"localhost:9999"} // A closed port
	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		fmt.Printf("Failed to create Kafka producer: %v\n", err)
	} else {
		fmt.Printf("Created Kafka producer successfully!\n")
		producer.Close()
	}
}
