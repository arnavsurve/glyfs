package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"log"
	"os"
)

var encryptionKey []byte

type EncryptionService struct {
	gcm cipher.AEAD
}

func InitEncryptionKey() {
	// First try dedicated encryption key
	envKey := os.Getenv("ENCRYPTION_KEY")
	if envKey != "" {
		hash := sha256.Sum256([]byte(envKey))
		encryptionKey = hash[:]
		return
	}

	log.Fatal("environment variable ENCRYPTION_KEY is not set")
}

func NewEncryptionService() (*EncryptionService, error) {
	if encryptionKey == nil {
		return nil, errors.New("encryption key not initialized - was InitEncryptionKey() called?")
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	return &EncryptionService{gcm: gcm}, nil
}

func (s *EncryptionService) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	nonce := make([]byte, s.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := s.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

func (s *EncryptionService) Decrypt(encrypted string) (string, error) {
	if encrypted == "" {
		return "", nil
	}

	data, err := base64.URLEncoding.DecodeString(encrypted)
	if err != nil {
		return "", err
	}

	nonceSize := s.gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := s.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// EncryptSensitiveFields encrypts sensitive fields in a map
func (s *EncryptionService) EncryptSensitiveFields(data map[string]any, sensitiveFields []string) (map[string]any, error) {
	result := make(map[string]any)

	for key, value := range data {
		result[key] = value

		// Check if this field should be encrypted
		for _, sensitive := range sensitiveFields {
			if key == sensitive {
				if str, ok := value.(string); ok {
					encrypted, err := s.Encrypt(str)
					if err != nil {
						return nil, err
					}
					result[key] = encrypted
				}
				break
			}
		}
	}

	return result, nil
}

// DecryptSensitiveFields decrypts sensitive fields in a map
func (s *EncryptionService) DecryptSensitiveFields(data map[string]any, sensitiveFields []string) (map[string]any, error) {
	result := make(map[string]any)

	for key, value := range data {
		result[key] = value

		// Check if this field should be decrypted
		for _, sensitive := range sensitiveFields {
			if key == sensitive {
				if str, ok := value.(string); ok {
					decrypted, err := s.Decrypt(str)
					if err != nil {
						return nil, err
					}
					result[key] = decrypted
				}
				break
			}
		}
	}

	return result, nil
}

