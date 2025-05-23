#!/bin/zsh

# Script to remove file path comments from all .liquid files
# Removes HTML comments that match the pattern <!-- File: path/to/file.liquid -->

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for processed files
processed=0
skipped=0

echo "Removing file path comments from .liquid files..."
echo "=============================================="

# Find all .liquid files in the current directory and subdirectories
find . -name "*.liquid" -type f | while read -r file; do
    # Remove leading ./ from the path
    clean_path="${file#./}"
    
    # Check if the file has the comment
    if grep -q "<!-- File: .*\.liquid -->" "$file" 2>/dev/null; then
        # Remove the line containing the file path comment
        # Using sed to remove lines matching the pattern
        sed -i '' '/<!-- File: .*\.liquid -->/d' "$file"
        
        echo "${GREEN}Removed comment from${NC} $clean_path"
        ((processed++))
    else
        echo "${YELLOW}Skipping${NC} $clean_path (no comment found)"
        ((skipped++))
    fi
done

echo "=============================================="
echo "${GREEN}✓ Processed: $processed files${NC}"
echo "${YELLOW}→ Skipped: $skipped files (no comments found)${NC}"
echo "Done!"