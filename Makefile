.PHONY: test

setup:
	@git submodule update --init
	@npm install

test:
	@npm test
