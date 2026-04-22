package services

type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string {
	return e.Message
}

func newError(status int, message string) error {
	return &Error{
		Status:  status,
		Message: message,
	}
}
