
def q2(a):
    a = list(a)
    for i in range(len(a)):
        if a[i] % 2 == 0:
            for j in range(i + 1, len(a)):
                a[j] = a[j] - a[i]
        else:
            for j in range(i + 1, len(a)):
                a[j] = a[j] + a[i]
    return " ".join(map(str, a))

def q3(a):
    out = []
    def solve(arr, index, current):
        if index == len(arr):
            out.append(str(current))
            return
        solve(arr, index + 1, current)
        if arr[index] not in current:
            current.append(arr[index])
            solve(arr, index + 1, current)
        current.pop()
    solve(a, 0, [])
    return "\n".join(out)

def q4(a, k):
    left = 0
    sum_val = 0
    max_len = 0
    for right in range(len(a)):
        sum_val += a[right]
        if sum_val > k:
            sum_val -= a[left]
            left += 1
        max_len = max(max_len, right - left + 1)
    return str(max_len)

def q5(r, c, m):
    out = []
    for j in range(c):
        row = []
        for i in range(r):
            row.append(str(m[i][j]))
        out.append(" ".join(row))
    return "\n".join(out)

print("Q2 Hidden:", q2([4, 10, 5, 8, 3]))
try:
    print("Q3 Hidden:", q3([3, 3, 4]))
except Exception as e:
    print("Q3 Hidden Error:", e)
print("Q4 Hidden:", q4([3, 1, 2, 7, 4, 2, 1, 1, 5], 8))
print("Q5 Hidden:", q5(2, 3, [[10, 20, 30], [40, 50, 60]]))
