#!/bin/bash
# Backup SQLite database using VACUUM INTO for a consistent snapshot.
# Usage: ./scripts/backup-db.sh [source_path] [backup_dir]

set -euo pipefail

DB_PATH="${1:-data/forum.db}"
BACKUP_DIR="${2:-data/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/forum_${TIMESTAMP}.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Backing up $DB_PATH → $BACKUP_FILE"
sqlite3 "$DB_PATH" "VACUUM INTO '$BACKUP_FILE';"

# Show backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Cleanup old backups (keep last 10)
cd "$BACKUP_DIR"
ls -t forum_*.db 2>/dev/null | tail -n +11 | xargs -r rm --
REMAINING=$(ls forum_*.db 2>/dev/null | wc -l)
echo "Backups retained: $REMAINING"
