package cache

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"sync"
	"time"

	"delivery-backend/internal/config"
)

type Store struct {
	memory *memoryStore
	redis  *redisClient
}

type memoryStore struct {
	mu      sync.RWMutex
	entries map[string]memoryEntry
}

type memoryEntry struct {
	value     []byte
	expiresAt time.Time
}

type redisClient struct {
	addr     string
	password string
	db       int
	timeout  time.Duration
}

func NewStore(cfg config.Config) *Store {
	store := &Store{
		memory: newMemoryStore(),
	}

	if cfg.RedisAddr == "" {
		return store
	}

	client, err := newRedisClient(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err == nil {
		store.redis = client
	}

	return store
}

func (s *Store) Get(key string) ([]byte, bool) {
	if s.redis != nil {
		if value, ok, err := s.redis.Get(key); err == nil && ok {
			s.memory.Set(key, value, time.Minute)
			return value, true
		}
	}

	return s.memory.Get(key)
}

func (s *Store) Set(key string, value []byte, ttl time.Duration) error {
	s.memory.Set(key, value, ttl)

	if s.redis != nil {
		if err := s.redis.Set(key, value, ttl); err != nil {
			return err
		}
	}

	return nil
}

func (s *Store) Delete(keys ...string) {
	s.memory.Delete(keys...)

	if s.redis != nil {
		_ = s.redis.Delete(keys...)
	}
}

func (s *Store) Publish(channel string, payload []byte) {
	if s.redis != nil {
		_ = s.redis.Publish(channel, payload)
	}
}

func (s *Store) GetJSON(key string, dst interface{}) bool {
	value, ok := s.Get(key)
	if !ok {
		return false
	}

	if err := json.Unmarshal(value, dst); err != nil {
		s.Delete(key)
		return false
	}

	return true
}

func (s *Store) SetJSON(key string, value interface{}, ttl time.Duration) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return s.Set(key, payload, ttl)
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		entries: make(map[string]memoryEntry),
	}
}

func (m *memoryStore) Get(key string) ([]byte, bool) {
	m.mu.RLock()
	entry, ok := m.entries[key]
	m.mu.RUnlock()
	if !ok {
		return nil, false
	}

	if !entry.expiresAt.IsZero() && time.Now().After(entry.expiresAt) {
		m.Delete(key)
		return nil, false
	}

	value := make([]byte, len(entry.value))
	copy(value, entry.value)

	return value, true
}

func (m *memoryStore) Set(key string, value []byte, ttl time.Duration) {
	copied := make([]byte, len(value))
	copy(copied, value)

	entry := memoryEntry{value: copied}
	if ttl > 0 {
		entry.expiresAt = time.Now().Add(ttl)
	}

	m.mu.Lock()
	m.entries[key] = entry
	m.mu.Unlock()
}

func (m *memoryStore) Delete(keys ...string) {
	m.mu.Lock()
	for _, key := range keys {
		delete(m.entries, key)
	}
	m.mu.Unlock()
}

func newRedisClient(addr, password string, db int) (*redisClient, error) {
	client := &redisClient{
		addr:     addr,
		password: password,
		db:       db,
		timeout:  500 * time.Millisecond,
	}

	if err := client.Ping(); err != nil {
		return nil, err
	}

	return client, nil
}

func (c *redisClient) Ping() error {
	response, err := c.do("PING")
	if err != nil {
		return err
	}

	if pong, ok := response.(string); !ok || pong != "PONG" {
		return fmt.Errorf("unexpected redis ping response: %v", response)
	}

	return nil
}

func (c *redisClient) Get(key string) ([]byte, bool, error) {
	response, err := c.do("GET", key)
	if err != nil {
		return nil, false, err
	}

	if response == nil {
		return nil, false, nil
	}

	switch value := response.(type) {
	case []byte:
		return value, true, nil
	case string:
		return []byte(value), true, nil
	default:
		return nil, false, fmt.Errorf("unexpected redis GET response type %T", response)
	}
}

func (c *redisClient) Set(key string, value []byte, ttl time.Duration) error {
	seconds := int(ttl.Seconds())
	if seconds <= 0 {
		seconds = 1
	}

	_, err := c.do("SET", key, string(value), "EX", strconv.Itoa(seconds))
	return err
}

func (c *redisClient) Delete(keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	args := append([]string{"DEL"}, keys...)
	_, err := c.do(args...)
	return err
}

func (c *redisClient) Publish(channel string, payload []byte) error {
	_, err := c.do("PUBLISH", channel, string(payload))
	return err
}

func (c *redisClient) do(args ...string) (interface{}, error) {
	conn, err := net.DialTimeout("tcp", c.addr, c.timeout)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(c.timeout))

	reader := bufio.NewReader(conn)
	writer := bufio.NewWriter(conn)

	if c.password != "" {
		if err := writeRedisCommand(writer, "AUTH", c.password); err != nil {
			return nil, err
		}
		if _, err := readRedisReply(reader); err != nil {
			return nil, err
		}
	}

	if c.db > 0 {
		if err := writeRedisCommand(writer, "SELECT", strconv.Itoa(c.db)); err != nil {
			return nil, err
		}
		if _, err := readRedisReply(reader); err != nil {
			return nil, err
		}
	}

	if err := writeRedisCommand(writer, args...); err != nil {
		return nil, err
	}

	return readRedisReply(reader)
}

func writeRedisCommand(writer *bufio.Writer, args ...string) error {
	if _, err := writer.WriteString(fmt.Sprintf("*%d\r\n", len(args))); err != nil {
		return err
	}

	for _, arg := range args {
		if _, err := writer.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(arg), arg)); err != nil {
			return err
		}
	}

	return writer.Flush()
}

func readRedisReply(reader *bufio.Reader) (interface{}, error) {
	prefix, err := reader.ReadByte()
	if err != nil {
		return nil, err
	}

	switch prefix {
	case '+':
		return readRedisLine(reader)
	case '-':
		line, err := readRedisLine(reader)
		if err != nil {
			return nil, err
		}
		return nil, errors.New(line)
	case ':':
		line, err := readRedisLine(reader)
		if err != nil {
			return nil, err
		}
		value, err := strconv.ParseInt(line, 10, 64)
		if err != nil {
			return nil, err
		}
		return value, nil
	case '$':
		line, err := readRedisLine(reader)
		if err != nil {
			return nil, err
		}
		size, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if size == -1 {
			return nil, nil
		}

		buffer := make([]byte, size+2)
		if _, err := io.ReadFull(reader, buffer); err != nil {
			return nil, err
		}

		return buffer[:size], nil
	case '*':
		line, err := readRedisLine(reader)
		if err != nil {
			return nil, err
		}
		count, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if count == -1 {
			return nil, nil
		}

		values := make([]interface{}, count)
		for index := 0; index < count; index++ {
			value, err := readRedisReply(reader)
			if err != nil {
				return nil, err
			}
			values[index] = value
		}
		return values, nil
	default:
		return nil, fmt.Errorf("unsupported redis reply prefix %q", string(prefix))
	}
}

func readRedisLine(reader *bufio.Reader) (string, error) {
	line, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}

	if len(line) < 2 {
		return "", fmt.Errorf("invalid redis line %q", line)
	}

	return line[:len(line)-2], nil
}
