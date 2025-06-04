#!/bin/sh

for CACHE in $(git ls-files --ignored --exclude-standard --cached); do
    echo "$CACHE" && git rm -f --cached "$CACHE"
done

npm pack --pack-destination packages --omit=dev
