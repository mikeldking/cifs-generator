cifs-generator
==============

A CIFS traffic generator written in Node

## Setup

In order to run the traffic generator, you must have a remote share setup. This script will read and write to a file in
the shared folder in order to generate CIFS traffic.

## Run

Run the CIFS traffic generator using the following command

    $ node generator -s \\\\0.0.0.0\\share -d domain -u user -p password

## Options

    -h, --help                       output usage information
    -V, --version                    output the version number
    -s, --share <share>              share
    -d, --shareDomain <shareDomain>  shareDomain
    -u, --username <username>        username
    -p, --password <password>        password
    -o, --octets <octets>            number of octets in the files for transfer (defaults to 2048000)
    -t, --time <time>                the amount of time to generate traffic in ms (defaults to 300000)
    -r, --read <read>                flag to perform reads (defaults to true)
    -w, --write <write>              flag to perform writes (defaults to true)