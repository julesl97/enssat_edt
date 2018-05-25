#!/bin/bash

echo [restart] >> log.txt

node server.js >> log.txt &

#function funcExit(){
#	echo "kill node process (server.js) ? [y/n]"
#	read answer
#	if [ $answer = "y" ]; then
#		pkill -e node
#	fi
#}
#
#trap funcExit INT

tail -f log.txt

