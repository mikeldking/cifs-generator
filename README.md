cifs-generator
==============

A CIFS traffic generator written in Node

## Setup

In order to run the traffic generator, you must have a remote share setup. This script will read and write to a file in
the shared folder in order to generate CIFS traffic.

## Run

Run the CIFS traffic generator using the following command

    $ node generator -s \\\\0.0.0.0\\share -d domain -u user -p password -t timeToRunInMs -o octetsOfTheFileToTransfer
