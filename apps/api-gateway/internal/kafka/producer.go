package kafka

import (
	"fmt"

	"github.com/IBM/sarama"
)

// Producer wraps the Sarama SyncProducer for reliable Kafka delivery.
type Producer struct {
	syncProducer sarama.SyncProducer
}

// NewProducer creates a robust Kafka producer (acks=all, idempotent=true).
func NewProducer(brokers []string) (*Producer, error) {
	config := sarama.NewConfig()
	// Maximum reliability requirements (Research1 §2.3)
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Idempotent = true
	config.Producer.Return.Successes = true
	// To use idempotent producer, Net.MaxOpenRequests must be <= 5 (Sarama default is 5)
	config.Net.MaxOpenRequests = 1

	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	return &Producer{syncProducer: producer}, nil
}

// Publish sends a message to Kafka with the given topic, partition key, and byte payload.
// Uses the partition key to guarantee chronological ordering.
func (p *Producer) Publish(topic, partitionKey string, payload []byte) error {
	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(partitionKey),
		Value: sarama.ByteEncoder(payload),
	}

	_, _, err := p.syncProducer.SendMessage(msg)
	if err != nil {
		return fmt.Errorf("failed to send message to Kafka topic %s: %w", topic, err)
	}
	return nil
}

// Close gracefully shuts down the producer.
func (p *Producer) Close() error {
	return p.syncProducer.Close()
}
