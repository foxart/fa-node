#!/usr/bin/env bash

set -eo pipefail

# ============================================
# CONFIG
# ============================================

SUBJECT_WIDTH="${SUBJECT_WIDTH:-50}"
BRANCH_WIDTH="${BRANCH_WIDTH:-40}"

COMMITS_PER_USER="${COMMITS_PER_USER:-5}"

REPORT_SECTION_TITLE="${REPORT_SECTION_TITLE:-## Report}"
DETAILED_SECTION_TITLE="${DETAILED_SECTION_TITLE:-## Detailed report}"

EMPTY_VALUE="${EMPTY_VALUE:--}"

OUTPUT_FILE="${OUTPUT_FILE:-./docs/author.md}"

sep=$'\x1f'

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

tmp_report="$(mktemp)"
tmp_detailed="$(mktemp)"
report_md="$(mktemp)"
detailed_md="$(mktemp)"
tmp_map="$(mktemp)"

# ============================================
# CLEANUP
# ============================================

cleanup() {
  rm -f "$tmp_report" "$tmp_detailed" "$report_md" "$detailed_md" "$tmp_map"
}
trap cleanup EXIT

# ============================================
# UTILS
# ============================================

truncate_field() {
  local value="$1"
  local width="$2"

  if [ "${#value}" -gt "$width" ]; then
    printf '%s' "${value:0:width}"
  else
    printf '%s' "$value"
  fi
}

# ============================================
# GIT HELPERS
# ============================================

get_authors() {
  git log --use-mailmap --all --pretty="format:%aN${sep}%aE" |
    awk -F"$sep" '
      {
        key = tolower($1)
        if (!seen[key]++) {
          print $1 FS $2
        }
      }
    '
}

get_all_emails() {
  local author="$1"

  git log --all --pretty="%an${sep}%aN${sep}%ae" |
    awk -F"$sep" -v target="$author" '
      tolower($2) == tolower(target) {
        emails[$3] = 1
      }
      END {
        first = 1
        for (e in emails) {
          if (!first) printf ", "
          printf "%s", e
          first = 0
        }
      }
    '
}

# ============================================
# MERGE PARSING
# ============================================

parse_merge_source_branch() {
  local subject="$1"

  if [[ "$subject" =~ from[[:space:]]+[^/]+/(.+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi

  if [[ "$subject" =~ Merge[[:space:]]branch[[:space:]]\'([^\']+)\' ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi

  if [[ "$subject" =~ origin/([^\']+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi

  return 1
}

# ============================================
# BUILD MERGE MAP
# ============================================

build_branch_map() {
  : >"$tmp_map"

  git rev-list --all --merges --reverse | while read -r merge_hash; do
    subject="$(git show -s --pretty=%s "$merge_hash")"
    branch="$(parse_merge_source_branch "$subject" || true)"
    [ -z "$branch" ] && continue

    git rev-list "${merge_hash}^2" --not "${merge_hash}^1" 2>/dev/null |
      while read -r commit; do
        echo "${commit}${sep}${branch}"
      done
  done >>"$tmp_map"
}

# ============================================
# BRANCH DETECTION
# ============================================

get_branch() {
  local hash="$1"
  local subject branch

  subject="$(git show -s --pretty=%s "$hash")"

  branch="$(parse_merge_source_branch "$subject" || true)"
  [ -n "$branch" ] && {
    echo "$branch"
    return
  }

  branch="$(awk -F"$sep" -v h="$hash" '$1 == h { print $2; exit }' "$tmp_map")"
  [ -n "$branch" ] && {
    echo "$branch"
    return
  }

  branch="$(git branch -r --contains "$hash" 2>/dev/null |
    sed 's/^ *//' |
    grep -v 'HEAD' |
    sed 's|origin/||' |
    grep -vE '^(main|master)$' |
    head -n1)"

  if [ -n "$branch" ]; then
    echo "$branch"
    return
  fi

  if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "HEAD" ]; then
    if git merge-base --is-ancestor "$hash" "$CURRENT_BRANCH" 2>/dev/null; then
      echo "$CURRENT_BRANCH"
      return
    fi
  fi

  echo "$EMPTY_VALUE"
}

# ============================================
# DATA COLLECTION
# ============================================

collect_data() {
  while IFS="$sep" read -r author email; do
    [ -z "$author" ] && continue

    all_emails="$(get_all_emails "$author")"

    stats="$(
      git log --use-mailmap --all --author="$author" \
        --date=format-local:'%d %b %Y %H:%M:%S' \
        --pretty="format:%at${sep}%ad" \
        --numstat |
        awk -v sep="$sep" '
          BEGIN { first_ts=0; last_ts=0 }
          $0 ~ /^[0-9]+/ && index($0, sep) {
            split($0,a,sep)
            ts=a[1]; date=a[2]; commits++
            if(first_ts==0||ts<first_ts){first_ts=ts;first_date=date}
            if(ts>last_ts){last_ts=ts;last_date=date}
          }
          /^[0-9]+\t[0-9]+/ { add+=$1; del+=$2 }
          END {
            printf "%s%s%s%s%s%s%s%s%s%s%s",
              commits,sep,first_date,sep,last_date,sep,add,sep,del,sep,last_ts
          }
        '
    )"

    IFS="$sep" read -r commits first_date last_date add del last_ts <<<"$stats"
    total=$((add + del))

    printf "%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s\n" \
      "$author" "$email" "$all_emails" "$commits" "$first_date" "$last_date" "$add" "$del" "$last_ts" \
      >>"$tmp_report"

    {
      echo "### $author"
      echo ""
      echo "- **Email:** $all_emails"
      echo "- **First:** ${first_date:-$EMPTY_VALUE}"
      echo "- **Last:** ${last_date:-$EMPTY_VALUE}"
      echo "- **Commits:** $commits"
      echo "- **Lines:** +$add / -$del / =$total"
      echo ""
      echo "| No | Hash | Date | Subject | Branch |"
      echo "|---:|------|------|---------|--------|"

      row_no=0
      seen_hashes=""

      phase="first"
      second_count=0

      while IFS= read -r line; do
        if [[ "$line" == "SPLIT" ]]; then
          phase="second"
          continue
        fi

        IFS="$sep" read -r hash date subject <<<"$line"

        if echo "$seen_hashes" | grep -q "|$hash|"; then
          continue
        fi
        seen_hashes="${seen_hashes}|$hash|"

        if [[ "$phase" == "second" ]]; then
          if [ "$second_count" -ge "$COMMITS_PER_USER" ]; then
            continue
          fi
          second_count=$((second_count + 1))

          if [ "$second_count" -eq 1 ]; then
            echo "| --- | --- | --- | --- | --- |"
          fi
        fi

        row_no=$((row_no + 1))
        branch="$(get_branch "$hash")"

        printf "| %s | %s | %s | %s | %s |\n" \
          "$row_no" \
          "$hash" \
          "$date" \
          "$(truncate_field "$subject" "$SUBJECT_WIDTH")" \
          "$(truncate_field "$branch" "$BRANCH_WIDTH")"

      done < <(
        {
          # последние
          git log --use-mailmap --all --author="$author" \
            -n "$COMMITS_PER_USER" \
            --date=format-local:'%d %b %Y %H:%M:%S' \
            --pretty="tformat:%h${sep}%ad${sep}%s"

          echo "SPLIT"

          # первые
          git log --use-mailmap --all --author="$author" \
            --reverse \
            --date=format-local:'%d %b %Y %H:%M:%S' \
            --pretty="tformat:%h${sep}%ad${sep}%s" |
            awk -v limit="$COMMITS_PER_USER" 'NR <= limit'
        }
      )

      echo ""
      echo "<!-- AUTHOR_BLOCK_END -->"
      echo ""

    } >>"$tmp_detailed"

  done < <(get_authors)
}

# ============================================
# GENERATORS
# ============================================

generate_report_md() {
  {
    echo "| Author | Email | Commits | First Commit | Last Commit | Lines |"
    echo "|--------|-------|---------|--------------|-------------|-------|"

    sort -t "$sep" -k7,7nr "$tmp_report" |
      while IFS="$sep" read -r name email _ commits first last add del _; do
        printf "| %s | %s | %s | %s | %s | +%s / -%s |\n" \
          "$name" "$email" "$commits" "$first" "$last" "$add" "$del"
      done
  } >"$report_md"
}

generate_detailed_md() {
  : >"$detailed_md"

  sort -t "$sep" -k9,9nr "$tmp_report" |
    while IFS="$sep" read -r name _ _ _ _ _ _ _ _; do
      awk -v author="### $name" '
        $0 == author { in_block = 1 }
        in_block { print }
        $0 == "<!-- AUTHOR_BLOCK_END -->" { in_block = 0 }
      ' "$tmp_detailed" >>"$detailed_md"

      echo >>"$detailed_md"
    done
}

# ============================================
# UPDATE FILE
# ============================================

update_markdown() {
  awk -v report_title="$REPORT_SECTION_TITLE" \
    -v detailed_title="$DETAILED_SECTION_TITLE" '
    BEGIN { in_report=0; in_detailed=0 }

    $0 == report_title {
      print; print ""
      while ((getline line < report_file) > 0) print line
      close(report_file)
      in_report=1
      next
    }

    $0 == detailed_title {
      print; print ""
      while ((getline line < detailed_file) > 0) print line
      close(detailed_file)
      in_detailed=1
      next
    }

    in_report && /^## / { in_report=0 }
    in_detailed && /^## / { in_detailed=0 }

    !in_report && !in_detailed { print }
  ' report_file="$report_md" detailed_file="$detailed_md" "$OUTPUT_FILE" \
    >"${OUTPUT_FILE}.tmp"

  mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
}

# ============================================
# MAIN
# ============================================

main() {
  echo "Generating author report..."

  build_branch_map
  collect_data
  generate_report_md
  generate_detailed_md
  update_markdown

  echo "Done -> $OUTPUT_FILE"
}

main "$@"
