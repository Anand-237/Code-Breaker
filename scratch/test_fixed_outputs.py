def q2_fixed(a):
    orig = list(a)
    a = list(a)
    for i in range(len(a)):
        if orig[i] % 2 == 0:
            for j in range(i + 1, len(a)):
                a[j] = a[j] - orig[i]
        else:
            for j in range(i + 1, len(a)):
                a[j] = a[j] + orig[i]
    return " ".join(map(str, a))

def q3_fixed(a):
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

def q5_fixed(r, c, m):
    out = []
    for j in range(c):
        row = []
        for i in range(r):
            row.append(str(m[i][j]))
        out.append(" ".join(row))
    return "\n".join(out)

print("Q2 Fixed Sample:", q2_fixed([2, 7, 4, 9, 6, 3]))
print("Q2 Fixed Hidden:", q2_fixed([4, 10, 5, 8, 3]))

print("Q3 Fixed Sample:\n", q3_fixed([1, 2, 2]))
print("Q3 Fixed Hidden:\n", q3_fixed([3, 3, 4]))

print("Q5 Fixed Sample:\n", q5_fixed(3, 3, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
print("Q5 Fixed Hidden:\n", q5_fixed(2, 3, [[10, 20, 30], [40, 50, 60]]))
