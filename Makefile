.PHONY: test

setup:
	@git submodule update --init
	@npm install

test:
	@NODE_ENV=test LOG_LEVEL=fatal npm test
