#!/bin/zsh

# Script to add file path comments to all .liquid files
# Creates an HTML comment at the beginning of each file with its path

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for processed files
processed=0
skipped=0

echo "Adding file path comments to .liquid files..."
echo "==========================================="

# Find all .liquid files in the current directory and subdirectories
find . -name "*.liquid" -type f | while read -r file; do
    # Remove leading ./ from the path
    clean_path="${file#./}"
    
    # Create the comment to add
    comment="<!-- File: $clean_path -->"
    
    # Check if the file already has this comment (to avoid duplicates)
    if grep -q "<!-- File: $clean_path -->" "$file" 2>/dev/null; then
        echo "${YELLOW}Skipping${NC} $clean_path (comment already exists)"
        ((skipped++))
    else
        # Create a temporary file with the comment at the beginning
        echo "$comment" > "$file.tmp"
        cat "$file" >> "$file.tmp"
        
        # Replace the original file with the temporary file
        mv "$file.tmp" "$file"
        
        echo "${GREEN}Added comment to${NC} $clean_path"
        ((processed++))
    fi
done

echo "==========================================="
echo "${GREEN}✓ Processed: $processed files${NC}"
echo "${YELLOW}→ Skipped: $skipped files (already had comments)${NC}"
echo "Done!"