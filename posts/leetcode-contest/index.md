# LC contest problems summary

> Solutions and hints for LeetCode biweekly and weekly contest problems, organized by contest with progressive hints.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/leetcode-contest/
- Published: 2021-11-28
- Updated: 2026-04-26
- Tags: algorithms, lc

---

### [Biweekly-66 (27th Nov, 2021)](https://leetcode.com/contest/biweekly-contest-66/)
1. [2085. Count Common Words With One Occurrence](https://leetcode.com/contest/biweekly-contest-66/problems/count-common-words-with-one-occurrence/)

Use hashmap (Counter)


2. [2086. Minimum Number of Buckets Required to Collect Rainwater from Houses](https://leetcode.com/contest/biweekly-contest-66/problems/minimum-number-of-buckets-required-to-collect-rainwater-from-houses/)"
 First put the bucket at best place and the remove those covering home. 
 Answer is (best bucket cnt + remaining house). 
 Corner case: check for each house is coverable 

3. [2087. Minimum Cost Homecoming of a Robot in a Grid](https://leetcode.com/contest/biweekly-contest-66/problems/minimum-cost-homecoming-of-a-robot-in-a-grid/)
 djikstra will fail. why ? 
 Too many cells to cover (10**10). Think of something else 
 To reach home, which path you need to take ? (cost is non-negative) 
 To reach home, number of rows and number of cols changes are fixed.  

4. [2088. Count Fertile Pyramids in a Land](https://leetcode.com/contest/biweekly-contest-66/problems/count-fertile-pyramids-in-a-land/)
 Deconstruct pyramid into smaller part and then think to calculate how many pyramids are there 
 we can calculate left and right perpendiculars and then construct pyramids from them 
 calculate for normal and flipped version of grid 

### [Weekly-269 (28th Nov, 2021)](https://leetcode.com/contest/weekly-contest-269)

1. [2089. Find Target Indices After Sorting Array](https://leetcode.com/contest/weekly-contest-269/problems/find-target-indices-after-sorting-array/)
 Implementation 
2. [2090. K Radius Subarray Averages](https://leetcode.com/contest/weekly-contest-269/problems/k-radius-subarray-averages/)
 Prefix sum 
3. [2091. Removing Minimum and Maximum From Array](https://leetcode.com/contest/weekly-contest-269/problems/removing-minimum-and-maximum-from-array/)
 Greedy cases to minimize number of remove
 min(r+1, n-l, l+1+(n-r)). here l and r are index of max and min elements (l < r). 
4. [2092. Find All People With Secret](https://leetcode.com/contest/weekly-contest-269/problems/find-all-people-with-secret/)
 sort by time and try to share secret
 at current timestamp, find connected components and color all nodes if one of them have seen secret

<!-- 
1. []()
 
2. []()
 
3. []()
 
4. []()
 
 -->
