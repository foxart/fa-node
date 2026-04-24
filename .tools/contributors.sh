#!/usr/bin/env bash
set -eo pipefail
# ============================================
# CONFIG
# ============================================
subject_width="${SUBJECT_WIDTH:-200}"
branch_width="${BRANCH_WIDTH:-100}"
commits_per_author="${COMMITS_PER_USER:-5}"
empty_value="${EMPTY_VALUE:--}"
output_file="${OUTPUT_FILE:-./contributors.md}"
report_section_header="${REPORT_SECTION_HEADER:-# Contributors}"
report_section_title="${REPORT_SECTION_TITLE:-## Summary}"
detailed_section_title="${DETAILED_SECTION_TITLE:-## Commits}"
summary_sort_field="${SUMMARY_SORT_FIELD:-lines}"
summary_sort_order="${SUMMARY_SORT_ORDER:-desc}"
commits_sort_field="${COMMITS_SORT_FIELD:-last_ts}"
commits_sort_order="${COMMITS_SORT_ORDER:-desc}"
sep=$'\x1f'
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
tmp_report="$(mktemp)"
tmp_blocks="$(mktemp)"
tmp_map="$(mktemp)"
tmp_branch_cache="$(mktemp)"
report_md="$(mktemp)"
detailed_md="$(mktemp)"
# ============================================
# CLEANUP
# ============================================
cleanup() {
  rm -f "$tmp_report" "$tmp_blocks" "$tmp_map" "$tmp_branch_cache" "$report_md" "$detailed_md"
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
# AUTHORS
# ============================================
get_authors() {
  git log --use-mailmap --all --pretty="format:%aN${sep}%aE" |
    awk -F"$sep" '{ key=tolower($1); if(!seen[key]++) print $1 FS $2 }'
}
get_all_emails() {
  local author="$1"
  git log --all --pretty="%an${sep}%aN${sep}%ae" |
    awk -F"$sep" -v target="$author" '
      tolower($2)==tolower(target){emails[$3]=1}
      END{
        first=1
        for(e in emails){
          if(!first) printf ", "
          printf "%s",e
          first=0
        }
      }'
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
# BRANCH CACHE
# ============================================
get_cached_branch() {
  local hash="$1"
  grep -m1 "^$hash$sep" "$tmp_branch_cache" | cut -d"$sep" -f2
}
set_cached_branch() {
  local hash="$1"
  local branch="$2"
  printf "%s%s%s\n" "$hash" "$sep" "$branch" >>"$tmp_branch_cache"
}
# ============================================
# BRANCH DETECTION (FAST)
# ============================================
get_branch() {
  local hash="$1"
  local subject="$2"
  local branch
  branch="$(get_cached_branch "$hash")"
  [ -n "$branch" ] && {
    echo "$branch"
    return
  }
  branch="$(parse_merge_source_branch "$subject" || true)"
  if [ -z "$branch" ]; then
    branch="$(awk -F"$sep" -v h="$hash" '$1==h{print $2;exit}' "$tmp_map")"
  fi
  if [ -z "$branch" ]; then
    branch="$(git branch -r --contains "$hash" 2>/dev/null |
      awk '
        /HEAD/ { next }
        {
          sub(/^ *origin\//, "")
          if ($0 !~ /^(main|master)$/) {
            print
            exit
          }
        }
      ')"
  fi
  if [ -z "$branch" ] && [ -n "$current_branch" ] && [ "$current_branch" != "HEAD" ]; then
    if git merge-base --is-ancestor "$hash" "$current_branch" 2>/dev/null; then
      branch="$current_branch"
    fi
  fi
  [ -z "$branch" ] && branch="$empty_value"
  set_cached_branch "$hash" "$branch"
  echo "$branch"
}
# ============================================
# DATA COLLECTION
# ============================================
collect_data() {
  : >"$tmp_blocks"
  : >"$tmp_branch_cache"
  while IFS="$sep" read -r author email; do
    [ -z "$author" ] && continue
    all_emails="$(get_all_emails "$author")"
    stats="$(
      git log --use-mailmap --all --author="$author" \
        --date=format-local:'%d %b %Y %H:%M:%S' \
        --pretty="format:%at${sep}%ad" \
        --numstat |
        awk -v s="$sep" '
        BEGIN{f=0;l=0}
        $0~/^[0-9]+/&&index($0,s){
          split($0,a,s)
          ts=a[1];d=a[2];c++
          if(f==0||ts<f){f=ts;fd=d}
          if(ts>l){l=ts;ld=d}
        }
        /^[0-9]+\t/{add+=$1;del+=$2}
        END{
          printf "%s%s%s%s%s%s%s%s%s%s%s",
          c,s,fd,s,ld,s,add,s,del,s,l
        }'
    )"
    IFS="$sep" read -r commits first last add del last_ts <<<"$stats"
    total=$((add + del))
    printf "%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s${sep}%s\n" \
      "$author" "$email" "$all_emails" "$commits" "$first" "$last" "$add" "$del" "$last_ts" \
      >>"$tmp_report"
    block_file="$(mktemp)"
    {
      echo "### $author"
      echo
      echo "- **Email:** $all_emails"
      echo "- **First:** ${first:-$empty_value}"
      echo "- **Last:** ${last:-$empty_value}"
      echo "- **Commits:** $commits"
      echo "- **Lines:** +$add / -$del / =$total"
      echo
      echo "| No | Hash | Date | Subject | Branch |"
      echo "|---:|------|------|---------|--------|"
      row=0
      seen="|"
      phase="first"
      second_count=0
      while IFS= read -r line; do
        if [[ "$line" == "SPLIT" ]]; then
          phase="second"
          continue
        fi
        IFS="$sep" read -r hash date subject <<<"$line"
        case "$seen" in
        *"|$hash|"*) continue ;;
        esac
        seen="${seen}${hash}|"
        if [[ "$phase" == "second" ]]; then
          if [ "$second_count" -ge "$commits_per_author" ]; then
            continue
          fi
          second_count=$((second_count + 1))
          if [ "$second_count" -eq 1 ]; then
            echo "| --- | --- | --- | --- | --- |"
          fi
        fi
        row=$((row + 1))
        branch="$(get_branch "$hash" "$subject")"
        printf "| %s | %s | %s | %s | %s |\n" \
          "$row" "$hash" "$date" \
          "$(truncate_field "$subject" "$subject_width")" \
          "$(truncate_field "$branch" "$branch_width")"
      done < <(
        {
          git log --use-mailmap --all --author="$author" \
            --reverse \
            --pretty="tformat:%h${sep}%ad${sep}%s" \
            --date=format-local:'%d %b %Y %H:%M:%S' |
            awk -v l="$commits_per_author" 'NR<=l'
          echo "SPLIT"
          git log --use-mailmap --all --author="$author" \
            -n "$commits_per_author" \
            --pretty="tformat:%h${sep}%ad${sep}%s" \
            --date=format-local:'%d %b %Y %H:%M:%S' |
            awk '{a[NR]=$0} END{for(i=NR;i>=1;i--)print a[i]}'
        }
      )
      echo
    } >"$block_file"
    echo "${block_file}${sep}${last_ts}${sep}${author}" >>"$tmp_blocks"
  done < <(get_authors)
}
# ============================================
# GENERATORS
# ============================================
generate_report_md() {
  case "$summary_sort_field" in
  commits) key="4,4n" ;;
  lines) key="7,7n" ;;
  last) key="9,9n" ;;
  *) key="7,7n" ;;
  esac
  [ "$summary_sort_order" = "desc" ] && key="${key}r"
  {
    echo "| Author | Email | First | Last | Commits | Lines |"
    echo "|--------|-------|---------|-------|------|-------|"
    sort -t "$sep" -k"$key" "$tmp_report" |
      while IFS="$sep" read -r n e _ c f l a d _; do
        total=$((a + d))
        printf "| %s | %s | %s | %s | %s | +%s / -%s / =%s |\n" \
          "$n" "$e" "$f" "$l" "$c" "$a" "$d" "$total"
      done
    echo
  } >"$report_md"
}
generate_detailed_md() {
  case "$commits_sort_field" in
  name) key="3,3" ;;
  *) key="2,2n" ;;
  esac
  [ "$commits_sort_order" = "desc" ] && key="${key}r"
  sort -t "$sep" -k"$key" "$tmp_blocks" |
    while IFS="$sep" read -r f _ _; do
      cat "$f"
      echo
    done >"$detailed_md"
}
# ============================================
# UPDATE
# ============================================
ensure_output_file() {
  [ -f "$output_file" ] && return
  mkdir -p "$(dirname "$output_file")"
  {
    echo "$report_section_header"
    echo
    echo "$report_section_title"
    echo
    echo "$detailed_section_title"
    echo
  } >"$output_file"
}
update_markdown() {
  ensure_output_file
  awk -v rt="$report_section_title" -v dt="$detailed_section_title" '
    BEGIN{r=0;d=0}
    $0==rt{print;print"";while((getline l<rf)>0)print l;close(rf);r=1;next}
    $0==dt{print;print"";while((getline l<df)>0)print l;close(df);d=1;next}
    r&&/^## /{r=0}
    d&&/^## /{d=0}
    !r&&!d{print}
  ' rf="$report_md" df="$detailed_md" "$output_file" >"$output_file.tmp"
  mv "$output_file.tmp" "$output_file"
}
# ============================================
# MAIN
# ============================================
main() {
  build_branch_map
  collect_data
  generate_report_md
  generate_detailed_md
  update_markdown
}
main "$@"
