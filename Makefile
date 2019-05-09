.PHONY: test

setup:
	@git submodule update --init
	@npm install

test:
	@NODE_ENV=test LOG_LEVEL=fatal npm test

build:
	@rm -rf es lib dist 2> /dev/null
	@npx rollup -c
