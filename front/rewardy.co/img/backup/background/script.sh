for f in ./*.png; do convert "$f" -alpha set -background none -channel A -evaluate multiply 0.5 +channel "${f%.*}.png"; done

for f in ./*.png; do convert "$f" -alpha set -background none -rotate 15  "${f%.*}.png"; done