

.PHONY: install run

install:
	poetry -C backend install

run:
run:
	poetry -C backend run \
		uvicorn app.main:app \
		--app-dir backend/src \
		--host 127.0.0.1 \
		--port 8000 \
		--reload
