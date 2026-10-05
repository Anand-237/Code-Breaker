require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initFirebase } = require('../config/firebase');
const Question = require('../models/Question');

const round3Questions = [
  {
    round: 3,
    questionType: 'debug',
    title: 'Hollow Square Pattern',
    questionText: 'Nested Loops & Boundary Logic: Print an N x N square pattern where only the outer border consists of asterisks (*) and the interior is filled with spaces.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == 0 || i == n - 1 || j == 0) {
                    System.out.print("*");
                } else {
                    System.out.print(" ");
                }
            }
            System.out.println();
        }
    }
}`,
    codeSnippetPython: `n = int(input())

for i in range(n):
    for j in range(n):
        if i == 0 or i == n - 1 or j == 0:
            print("*", end="")
        else:
            print(" ", end="")
    print()`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == 0 || i == n - 1 || j == 0) {
                    System.out.print("*");
                } else {
                    System.out.print(" ");
                }
            }
            System.out.println();
        }
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == 0 || i == n - 1 || j == 0 || j == n - 1) {
                    System.out.print("*");
                } else {
                    System.out.print(" ");
                }
            }
            System.out.println();
        }
    }
}`,
      answer: '****\n*  *\n*  *\n****',
      input: '4',
      hiddenInput: '3',
      hiddenAnswer: '***\n* *\n***',
      hiddenInput2: '5',
      hiddenAnswer2: '*****\n*   *\n*   *\n*   *\n*****',
    },
    python: {
      code: `n = int(input())

for i in range(n):
    for j in range(n):
        if i == 0 or i == n - 1 or j == 0:
            print("*", end="")
        else:
            print(" ", end="")
    print()`,
      correctCode: `n = int(input())

for i in range(n):
    for j in range(n):
        if i == 0 or i == n - 1 or j == 0 or j == n - 1:
            print("*", end="")
        else:
            print(" ", end="")
    print()`,
      answer: '****\n*  *\n*  *\n****',
      input: '4',
      hiddenInput: '3',
      hiddenAnswer: '***\n* *\n***',
      hiddenInput2: '5',
      hiddenAnswer2: '*****\n*   *\n*   *\n*   *\n*****',
    },
    buggyCode: `n = int(input())

for i in range(n):
    for j in range(n):
        if i == 0 or i == n - 1 or j == 0:
            print("*", end="")
        else:
            print(" ", end="")
    print()`,
    language: 'python',
    testInput: '4',
    expectedOutput: '****\n*  *\n*  *\n****',
    hiddenInput: '3',
    hiddenExpectedOutput: '***\n* *\n***',
    correctOutput: '****\n*  *\n*  *\n****',
    correctAnswer: '****\n*  *\n*  *\n****',
    marks: 5,
    points: 5,
    order: 1,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'Palindrome Ignoring Case',
    questionText: 'Two-Pointer Traversal & Case-Insensitive Matching: Compare characters symmetrically from both ends towards the center to check if a string reads the same forwards and backwards, ignoring uppercase and lowercase differences.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next().toLowerCase();

        int left = 0;
        int right = s.length() - 1;
        boolean isPal = true;

        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                isPal = false;
                break;
            }
            left++;
            left++;
        }

        System.out.println(isPal ? "true" : "false");
    }
}`,
    codeSnippetPython: `s = input().strip().lower()

left = 0
right = len(s) - 1
is_pal = True

while left < right:
    if s[left] != s[right]:
        is_pal = False
        break
    left += 1
    left += 1

print("true" if is_pal else "false")`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next().toLowerCase();

        int left = 0;
        int right = s.length() - 1;
        boolean isPal = true;

        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                isPal = false;
                break;
            }
            left++;
            left++;
        }

        System.out.println(isPal ? "true" : "false");
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next().toLowerCase();

        int left = 0;
        int right = s.length() - 1;
        boolean isPal = true;

        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                isPal = false;
                break;
            }
            left++;
            right--;
        }

        System.out.println(isPal ? "true" : "false");
    }
}`,
      answer: 'true',
      input: 'Racecar',
      hiddenInput: 'Madam',
      hiddenAnswer: 'true',
      hiddenInput2: 'Hello',
      hiddenAnswer2: 'false',
    },
    python: {
      code: `s = input().strip().lower()

left = 0
right = len(s) - 1
is_pal = True

while left < right:
    if s[left] != s[right]:
        is_pal = False
        break
    left += 1
    left += 1

print("true" if is_pal else "false")`,
      correctCode: `s = input().strip().lower()

left = 0
right = len(s) - 1
is_pal = True

while left < right:
    if s[left] != s[right]:
        is_pal = False
        break
    left += 1
    right -= 1

print("true" if is_pal else "false")`,
      answer: 'true',
      input: 'Racecar',
      hiddenInput: 'Madam',
      hiddenAnswer: 'true',
      hiddenInput2: 'Hello',
      hiddenAnswer2: 'false',
    },
    buggyCode: `s = input().strip().lower()

left = 0
right = len(s) - 1
is_pal = True

while left < right:
    if s[left] != s[right]:
        is_pal = False
        break
    left += 1
    left += 1

print("true" if is_pal else "false")`,
    language: 'python',
    testInput: 'Racecar',
    expectedOutput: 'true',
    hiddenInput: 'Madam',
    hiddenExpectedOutput: 'true',
    correctOutput: 'true',
    correctAnswer: 'true',
    marks: 5,
    points: 5,
    order: 2,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'Character Frequency',
    questionText: 'Key-Value Frequency Counting & Traversal: Maintain a character frequency count table while preserving character insertion order to display each unique character alongside its total occurrence count.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        Map<Character, Integer> freq = new LinkedHashMap<>();

        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (freq.containsKey(ch)) {
                freq.put(ch, 1);
            } else {
                freq.put(ch, 1);
            }
        }

        for (Map.Entry<Character, Integer> entry : freq.entrySet()) {
            System.out.println(entry.getKey() + ":" + entry.getValue());
        }
    }
}`,
    codeSnippetPython: `s = input().strip()

freq = {}
for ch in s:
    if ch in freq:
        freq[ch] = 1
    else:
        freq[ch] = 1

for ch in freq:
    print(f"{ch}:{freq[ch]}")`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        Map<Character, Integer> freq = new LinkedHashMap<>();

        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (freq.containsKey(ch)) {
                freq.put(ch, 1);
            } else {
                freq.put(ch, 1);
            }
        }

        for (Map.Entry<Character, Integer> entry : freq.entrySet()) {
            System.out.println(entry.getKey() + ":" + entry.getValue());
        }
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        Map<Character, Integer> freq = new LinkedHashMap<>();

        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (freq.containsKey(ch)) {
                freq.put(ch, freq.get(ch) + 1);
            } else {
                freq.put(ch, 1);
            }
        }

        for (Map.Entry<Character, Integer> entry : freq.entrySet()) {
            System.out.println(entry.getKey() + ":" + entry.getValue());
        }
    }
}`,
      answer: 'b:1\na:3\nn:2',
      input: 'banana',
      hiddenInput: 'apple',
      hiddenAnswer: 'a:1\np:2\nl:1\ne:1',
      hiddenInput2: 'mississippi',
      hiddenAnswer2: 'm:1\ni:4\ns:4\np:2',
    },
    python: {
      code: `s = input().strip()

freq = {}
for ch in s:
    if ch in freq:
        freq[ch] = 1
    else:
        freq[ch] = 1

for ch in freq:
    print(f"{ch}:{freq[ch]}")`,
      correctCode: `s = input().strip()

freq = {}
for ch in s:
    if ch in freq:
        freq[ch] = freq[ch] + 1
    else:
        freq[ch] = 1

for ch in freq:
    print(f"{ch}:{freq[ch]}")`,
      answer: 'b:1\na:3\nn:2',
      input: 'banana',
      hiddenInput: 'apple',
      hiddenAnswer: 'a:1\np:2\nl:1\ne:1',
      hiddenInput2: 'mississippi',
      hiddenAnswer2: 'm:1\ni:4\ns:4\np:2',
    },
    buggyCode: `s = input().strip()

freq = {}
for ch in s:
    if ch in freq:
        freq[ch] = 1
    else:
        freq[ch] = 1

for ch in freq:
    print(f"{ch}:{freq[ch]}")`,
    language: 'python',
    testInput: 'banana',
    expectedOutput: 'b:1\na:3\nn:2',
    hiddenInput: 'apple',
    hiddenExpectedOutput: 'a:1\np:2\nl:1\ne:1',
    correctOutput: 'b:1\na:3\nn:2',
    correctAnswer: 'b:1\na:3\nn:2',
    marks: 5,
    points: 5,
    order: 3,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'Move Zeros to End',
    questionText: 'In-Place Array Rearrangement & Zero Shifting: Shift all non-zero elements to the beginning of the array while maintaining their relative order, and pad all remaining positions at the end with zeros.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();

        int pos = 0;
        for (int i = 0; i < n; i++) {
            if (a[i] != 0) {
                a[pos] = a[i];
                pos++;
            }
        }

        for (int i = 0; i < n; i++) {
            System.out.print(a[i] + (i == n - 1 ? "" : " "));
        }
    }
}`,
    codeSnippetPython: `a = list(map(int, input().split()))

pos = 0
for i in range(len(a)):
    if a[i] != 0:
        a[pos] = a[i]
        pos += 1

print(*a)`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();

        int pos = 0;
        for (int i = 0; i < n; i++) {
            if (a[i] != 0) {
                a[pos] = a[i];
                pos++;
            }
        }

        for (int i = 0; i < n; i++) {
            System.out.print(a[i] + (i == n - 1 ? "" : " "));
        }
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();

        int pos = 0;
        for (int i = 0; i < n; i++) {
            if (a[i] != 0) {
                a[pos] = a[i];
                pos++;
            }
        }

        while (pos < n) {
            a[pos] = 0;
            pos++;
        }

        for (int i = 0; i < n; i++) {
            System.out.print(a[i] + (i == n - 1 ? "" : " "));
        }
    }
}`,
      answer: '1 3 12 0 0',
      input: '5\n0 1 0 3 12',
      hiddenInput: '3\n0 0 1',
      hiddenAnswer: '1 0 0',
      hiddenInput2: '7\n4 2 4 0 0 3 0',
      hiddenAnswer2: '4 2 4 3 0 0 0',
    },
    python: {
      code: `a = list(map(int, input().split()))

pos = 0
for i in range(len(a)):
    if a[i] != 0:
        a[pos] = a[i]
        pos += 1

print(*a)`,
      correctCode: `a = list(map(int, input().split()))

pos = 0
for i in range(len(a)):
    if a[i] != 0:
        a[pos] = a[i]
        pos += 1

while pos < len(a):
    a[pos] = 0
    pos += 1

print(*a)`,
      answer: '1 3 12 0 0',
      input: '0 1 0 3 12',
      hiddenInput: '0 0 1',
      hiddenAnswer: '1 0 0',
      hiddenInput2: '4 2 4 0 0 3 0',
      hiddenAnswer2: '4 2 4 3 0 0 0',
    },
    buggyCode: `a = list(map(int, input().split()))

pos = 0
for i in range(len(a)):
    if a[i] != 0:
        a[pos] = a[i]
        pos += 1

print(*a)`,
    language: 'python',
    testInput: '0 1 0 3 12',
    expectedOutput: '1 3 12 0 0',
    hiddenInput: '0 0 1',
    hiddenExpectedOutput: '1 0 0',
    correctOutput: '1 3 12 0 0',
    correctAnswer: '1 3 12 0 0',
    marks: 5,
    points: 5,
    order: 4,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'Longest Word in a Sentence',
    questionText: 'String Tokenization & Maximum Length Tracking: Tokenize a given sentence into individual words and iterate through the tokens to find and return the word with the maximum length.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String sentence = sc.nextLine().trim();
        String[] words = sentence.split("\\s+");

        String longest = "";

        for (String word : words) {
            if (word.length() < longest.length()) {
                longest = word;
            }
        }

        System.out.println(longest);
    }
}`,
    codeSnippetPython: `sentence = input().strip()
words = sentence.split()

longest = ""

for word in words:
    if len(word) < len(longest):
        longest = word

print(longest)`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String sentence = sc.nextLine().trim();
        String[] words = sentence.split("\\s+");

        String longest = "";

        for (String word : words) {
            if (word.length() < longest.length()) {
                longest = word;
            }
        }

        System.out.println(longest);
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String sentence = sc.nextLine().trim();
        String[] words = sentence.split("\\s+");

        String longest = "";

        for (String word : words) {
            if (word.length() > longest.length()) {
                longest = word;
            }
        }

        System.out.println(longest);
    }
}`,
      answer: 'quick',
      input: 'The quick brown fox jumps over the lazy dog',
      hiddenInput: 'Coding challenges build problem solving skills',
      hiddenAnswer: 'challenges',
      hiddenInput2: 'Data structures and algorithms',
      hiddenAnswer2: 'structures',
    },
    python: {
      code: `sentence = input().strip()
words = sentence.split()

longest = ""

for word in words:
    if len(word) < len(longest):
        longest = word

print(longest)`,
      correctCode: `sentence = input().strip()
words = sentence.split()

longest = ""

for word in words:
    if len(word) > len(longest):
        longest = word

print(longest)`,
      answer: 'quick',
      input: 'The quick brown fox jumps over the lazy dog',
      hiddenInput: 'Coding challenges build problem solving skills',
      hiddenAnswer: 'challenges',
      hiddenInput2: 'Data structures and algorithms',
      hiddenAnswer2: 'structures',
    },
    buggyCode: `sentence = input().strip()
words = sentence.split()

longest = ""

for word in words:
    if len(word) < len(longest):
        longest = word

print(longest)`,
    language: 'python',
    testInput: 'The quick brown fox jumps over the lazy dog',
    expectedOutput: 'quick',
    hiddenInput: 'Coding challenges build problem solving skills',
    hiddenExpectedOutput: 'challenges',
    correctOutput: 'quick',
    correctAnswer: 'quick',
    marks: 5,
    points: 5,
    order: 5,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'Diamond Number Pattern',
    questionText: 'Symmetric Nested Loops & Peak Generation: Generate a diamond-shaped number pattern for a given size N using symmetric upper and lower loop logic with sequential counting up to the peak line.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int mid = n / 2;

        for (int i = 0; i < n; i++) {
            int count = (i <= mid) ? i + 1 : n - i;

            for (int j = 1; j <= count; j++) {
                System.out.print(j);
            }
            for (int j = count; j >= 1; j--) {
                System.out.print(j);
            }
            System.out.println();
        }
    }
}`,
    codeSnippetPython: `n = int(input())
mid = n // 2

for i in range(n):
    if i <= mid:
        count = i + 1
    else:
        count = n - i

    for j in range(1, count + 1):
        print(j, end="")
    for j in range(count, 0, -1):
        print(j, end="")
    print()`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int mid = n / 2;

        for (int i = 0; i < n; i++) {
            int count = (i <= mid) ? i + 1 : n - i;

            for (int j = 1; j <= count; j++) {
                System.out.print(j);
            }
            for (int j = count; j >= 1; j--) {
                System.out.print(j);
            }
            System.out.println();
        }
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int mid = n / 2;

        for (int i = 0; i < n; i++) {
            int count = (i <= mid) ? i + 1 : n - i;

            for (int j = 1; j <= count; j++) {
                System.out.print(j);
            }
            for (int j = count - 1; j >= 1; j--) {
                System.out.print(j);
            }
            System.out.println();
        }
    }
}`,
      answer: '1\n121\n1',
      input: '3',
      hiddenInput: '5',
      hiddenAnswer: '1\n121\n12321\n121\n1',
      hiddenInput2: '7',
      hiddenAnswer2: '1\n121\n12321\n1234321\n12321\n121\n1',
    },
    python: {
      code: `n = int(input())
mid = n // 2

for i in range(n):
    if i <= mid:
        count = i + 1
    else:
        count = n - i

    for j in range(1, count + 1):
        print(j, end="")
    for j in range(count, 0, -1):
        print(j, end="")
    print()`,
      correctCode: `n = int(input())
mid = n // 2

for i in range(n):
    if i <= mid:
        count = i + 1
    else:
        count = n - i

    for j in range(1, count + 1):
        print(j, end="")
    for j in range(count - 1, 0, -1):
        print(j, end="")
    print()`,
      answer: '1\n121\n1',
      input: '3',
      hiddenInput: '5',
      hiddenAnswer: '1\n121\n12321\n121\n1',
      hiddenInput2: '7',
      hiddenAnswer2: '1\n121\n12321\n1234321\n12321\n121\n1',
    },
    buggyCode: `n = int(input())
mid = n // 2

for i in range(n):
    if i <= mid:
        count = i + 1
    else:
        count = n - i

    for j in range(1, count + 1):
        print(j, end="")
    for j in range(count, 0, -1):
        print(j, end="")
    print()`,
    language: 'python',
    testInput: '3',
    expectedOutput: '1\n121\n1',
    hiddenInput: '5',
    hiddenExpectedOutput: '1\n121\n12321\n121\n1',
    correctOutput: '1\n121\n1',
    correctAnswer: '1\n121\n1',
    marks: 5,
    points: 5,
    order: 6,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'First Non-Repeating Character',
    questionText: 'Frequency Mapping & Order-Preserving Search: Count character occurrences across the input string and perform a second pass to identify the first character whose total frequency equals exactly 1.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        Map<Character, Integer> counts = new HashMap<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            counts.put(c, counts.getOrDefault(c, 0) + 1);
        }

        String ans = "-1";
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (counts.get(c) > 1) {
                ans = String.valueOf(c);
                break;
            }
        }

        System.out.println(ans);
    }
}`,
    codeSnippetPython: `s = input().strip()

counts = {}
for ch in s:
    counts[ch] = counts.get(ch, 0) + 1

ans = "-1"
for ch in s:
    if counts[ch] > 1:
        ans = ch
        break

print(ans)`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        Map<Character, Integer> counts = new HashMap<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            counts.put(c, counts.getOrDefault(c, 0) + 1);
        }

        String ans = "-1";
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (counts.get(c) > 1) {
                ans = String.valueOf(c);
                break;
            }
        }

        System.out.println(ans);
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        Map<Character, Integer> counts = new HashMap<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            counts.put(c, counts.getOrDefault(c, 0) + 1);
        }

        String ans = "-1";
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (counts.get(c) == 1) {
                ans = String.valueOf(c);
                break;
            }
        }

        System.out.println(ans);
    }
}`,
      answer: 'w',
      input: 'swiss',
      hiddenInput: 'racecar',
      hiddenAnswer: 'e',
      hiddenInput2: 'aabbcc',
      hiddenAnswer2: '-1',
    },
    python: {
      code: `s = input().strip()

counts = {}
for ch in s:
    counts[ch] = counts.get(ch, 0) + 1

ans = "-1"
for ch in s:
    if counts[ch] > 1:
        ans = ch
        break

print(ans)`,
      correctCode: `s = input().strip()

counts = {}
for ch in s:
    counts[ch] = counts.get(ch, 0) + 1

ans = "-1"
for ch in s:
    if counts[ch] == 1:
        ans = ch
        break

print(ans)`,
      answer: 'w',
      input: 'swiss',
      hiddenInput: 'racecar',
      hiddenAnswer: 'e',
      hiddenInput2: 'aabbcc',
      hiddenAnswer2: '-1',
    },
    buggyCode: `s = input().strip()

counts = {}
for ch in s:
    counts[ch] = counts.get(ch, 0) + 1

ans = "-1"
for ch in s:
    if counts[ch] > 1:
        ans = ch
        break

print(ans)`,
    language: 'python',
    testInput: 'swiss',
    expectedOutput: 'w',
    hiddenInput: 'racecar',
    hiddenExpectedOutput: 'e',
    correctOutput: 'w',
    correctAnswer: 'w',
    marks: 5,
    points: 5,
    order: 7,
    isActive: true,
  },
  {
    round: 3,
    questionType: 'debug',
    title: 'Remove Adjacent Duplicates',
    questionText: 'Sequential De-duplication & Stack Traversal: Process string characters sequentially and eliminate adjacent duplicate pairs using a stack or dynamic string builder until no consecutive identical characters remain.',
    codeSnippet: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            int len = sb.length();
            if (len > 0 && sb.charAt(len - 1) == c) {

            } else {
                sb.append(c);
            }
        }

        System.out.println(sb.toString());
    }
}`,
    codeSnippetPython: `s = input().strip()

stack = []
for ch in s:
    if stack and stack[-1] == ch:
        pass
    else:
        stack.append(ch)

print("".join(stack))`,
    java: {
      code: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            int len = sb.length();
            if (len > 0 && sb.charAt(len - 1) == c) {

            } else {
                sb.append(c);
            }
        }

        System.out.println(sb.toString());
    }
}`,
      correctCode: `import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            int len = sb.length();
            if (len > 0 && sb.charAt(len - 1) == c) {
                sb.deleteCharAt(len - 1);
            } else {
                sb.append(c);
            }
        }

        System.out.println(sb.toString());
    }
}`,
      answer: 'ca',
      input: 'abbaca',
      hiddenInput: 'azxxzy',
      hiddenAnswer: 'ay',
      hiddenInput2: 'aabccba',
      hiddenAnswer2: 'a',
    },
    python: {
      code: `s = input().strip()

stack = []
for ch in s:
    if stack and stack[-1] == ch:
        pass
    else:
        stack.append(ch)

print("".join(stack))`,
      correctCode: `s = input().strip()

stack = []
for ch in s:
    if stack and stack[-1] == ch:
        stack.pop()
    else:
        stack.append(ch)

print("".join(stack))`,
      answer: 'ca',
      input: 'abbaca',
      hiddenInput: 'azxxzy',
      hiddenAnswer: 'ay',
      hiddenInput2: 'aabccba',
      hiddenAnswer2: 'a',
    },
    buggyCode: `s = input().strip()

stack = []
for ch in s:
    if stack and stack[-1] == ch:
        pass
    else:
        stack.append(ch)

print("".join(stack))`,
    language: 'python',
    testInput: 'abbaca',
    expectedOutput: 'ca',
    hiddenInput: 'azxxzy',
    hiddenExpectedOutput: 'ay',
    correctOutput: 'ca',
    correctAnswer: 'ca',
    marks: 5,
    points: 5,
    order: 8,
    isActive: true,
  },
];

async function updateDB() {
  initFirebase();

  const deleteRes = await Question.deleteMany({ round: 3 });
  console.log('Deleted old Round 3 questions count:', deleteRes.deletedCount);

  const insertRes = await Question.insertMany(round3Questions);
  console.log('Inserted new Round 3 questions count:', insertRes.length);

  const r1Count = await Question.countDocuments({ round: 1 });
  const r2Count = await Question.countDocuments({ round: 2 });
  const r3Count = await Question.countDocuments({ round: 3 });

  console.log(`CURRENT FIREBASE STATS:\nRound 1: ${r1Count}\nRound 2: ${r2Count}\nRound 3: ${r3Count}`);
}

updateDB().catch(console.error);
