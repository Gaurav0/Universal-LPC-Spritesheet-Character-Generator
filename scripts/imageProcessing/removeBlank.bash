find spritesheets -type f -name "*.png" -print0 | while read -d $'\0' file
do
    echo "$file"
    data=$(magick $file -channel a -separate -scale 1x1! -format "%[fx:mean]\n" info:)
    echo "$data"
    if [[ "$data" == 0 ]]; then
        rm -v $file
    fi
done