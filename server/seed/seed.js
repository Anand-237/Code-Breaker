require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const RoundControl = require('../models/RoundControl');
const { restoreUserBackup, saveUserBackup } = require('../utils/userBackup');

const seed = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      if (process.env.MONGODB_URI) {
        try {
          await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
        } catch (err) {
          console.warn('  Standalone seed could not connect to remote MONGODB_URI. Seed will run on server startup automatically.');
          return;
        }
      }
    }

    // ─── Restore any backed up users first ─────────────────────────────────────
    await restoreUserBackup();

    // ─── Admin Account ────────────────────────────────────────────────────────
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      await User.create({
        name: 'Event Admin',
        username: 'admin',
        password: 'CodeBreaker123',
        role: 'admin',
      });
      console.log('  Admin created: username=admin, password=CodeBreaker123');
    }

    // ─── RoundControl docs (all 3 rounds, locked by default) ─────────────────
    for (const round of [1, 2, 3]) {
      await RoundControl.findOneAndUpdate(
        { round },
        { round, isUnlocked: false },
        { upsert: true }
      );
    }

    // ─── Round 1 Questions (Basic: 15 questions x 2 marks = 30 marks) ────────
    await Question.deleteMany({ round: 1 });
    await Question.insertMany([
      {
        round: 1,
        questionType: 'mcq',
        title: 'Python | Sliding Window',
        questionText: 'Which technique finds the longest substring without repeating characters?',
        options: ['Sorting', 'Sliding Window', 'Recursion', 'Binary Search'],
        correctOptionIndex: 1,
        correctAnswer: 'Sliding Window',
        marks: 2,
        points: 2,
        order: 1,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Java | Duplicate Removal',
        questionText: 'Which collection removes duplicates while preserving insertion order?',
        options: ['HashSet', 'TreeSet', 'LinkedHashSet', 'ArrayList'],
        correctOptionIndex: 2,
        correctAnswer: 'LinkedHashSet',
        marks: 2,
        points: 2,
        order: 2,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Python | Merge Intervals',
        questionText: 'What should be done first to efficiently merge overlapping intervals?',
        options: ['Reverse', 'Sort', 'Hash', 'Shuffle'],
        correctOptionIndex: 1,
        correctAnswer: 'Sort',
        marks: 2,
        points: 2,
        order: 3,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Java | Binary Search',
        questionText: 'To find the first occurrence of a duplicate target, what should binary search do after finding it?',
        options: ['Stop', 'Go right', 'Go left', 'Restart'],
        correctOptionIndex: 2,
        correctAnswer: 'Go left',
        marks: 2,
        points: 2,
        order: 4,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Python | Frequency',
        questionText: 'Which Python tool directly finds the most frequent elements?',
        options: ['Counter', 'deque', 'set', 'map'],
        correctOptionIndex: 0,
        correctAnswer: 'Counter',
        marks: 2,
        points: 2,
        order: 5,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Java | Brackets',
        questionText: 'Which data structure is best for checking balanced brackets?',
        options: ['Queue', 'Stack', 'Heap', 'Graph'],
        correctOptionIndex: 1,
        correctAnswer: 'Stack',
        marks: 2,
        points: 2,
        order: 6,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Python | Matrix',
        questionText: 'Which technique is commonly used for spiral matrix traversal?',
        options: ['Four boundaries', 'Binary tree', 'Hash table', 'Recursion only'],
        correctOptionIndex: 0,
        correctAnswer: 'Four boundaries',
        marks: 2,
        points: 2,
        order: 7,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Java | Two Sum',
        questionText: 'For a sorted array, which technique efficiently checks for a target pair?',
        options: ['DFS', 'Two Pointers', 'Stack', 'Heap'],
        correctOptionIndex: 1,
        correctAnswer: 'Two Pointers',
        marks: 2,
        points: 2,
        order: 8,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Python | Missing Positive',
        questionText: 'Which structure can quickly track numbers already present?',
        options: ['Set', 'Queue', 'Tuple', 'String'],
        correctOptionIndex: 0,
        correctAnswer: 'Set',
        marks: 2,
        points: 2,
        order: 9,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Java | Sorting Objects',
        questionText: 'Which Java feature is best for custom multi-condition sorting?',
        options: ['Comparator', 'Scanner', 'Thread', 'StringBuilder'],
        correctOptionIndex: 0,
        correctAnswer: 'Comparator',
        marks: 2,
        points: 2,
        order: 10,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Operating Systems | Deadlock',
        questionText: 'Four processes each hold one resource and wait indefinitely for another resource held by another process. Which combination of conditions is required for a deadlock to occur?',
        options: [
          'Mutual exclusion, hold and wait, no preemption, circular wait',
          'Mutual exclusion, preemption, starvation, circular wait',
          'Hold and wait, starvation, paging, mutual exclusion',
          'Circular wait, scheduling, preemption, fragmentation',
        ],
        correctOptionIndex: 0,
        correctAnswer: 'Mutual exclusion, hold and wait, no preemption, circular wait',
        marks: 2,
        points: 2,
        order: 11,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'DBMS | Serializability',
        questionText: 'Consider two transactions:\n\nT1: R(A) → W(A) → R(B) → W(B)\n\nT2: R(B) → W(B) → R(A) → W(A)\n\nTheir operations create conflicting dependencies in both directions between the transactions. Which property is violated if they cannot be rearranged into an equivalent serial execution?',
        options: ['Atomicity', 'Serializability', 'Durability', 'Referential Integrity'],
        correctOptionIndex: 1,
        correctAnswer: 'Serializability',
        marks: 2,
        points: 2,
        order: 12,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Data Structures | Heap',
        questionText: 'A system repeatedly needs to process the highest-priority element, while new elements can be inserted at any time. Which data structure is most suitable?',
        options: ['Binary Search Tree', 'Max Heap', 'Circular Queue', 'Hash Set'],
        correctOptionIndex: 1,
        correctAnswer: 'Max Heap',
        marks: 2,
        points: 2,
        order: 13,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'Memory Management | Paging',
        questionText: 'A process accesses a virtual memory address whose corresponding page is not currently loaded into physical memory. What occurs?',
        options: [
          'Segmentation fault always occurs',
          'A page fault occurs and the operating system handles the missing page',
          'The CPU permanently terminates the process',
          'The page is automatically converted into a segment',
        ],
        correctOptionIndex: 1,
        correctAnswer: 'A page fault occurs and the operating system handles the missing page',
        marks: 2,
        points: 2,
        order: 14,
      },
      {
        round: 1,
        questionType: 'mcq',
        title: 'DBMS | Indexing',
        questionText: 'A database table contains millions of records. A query frequently searches using:\n\nSELECT * FROM Employee\nWHERE employee_id = 10542;\n\n"employee_id" is frequently used for exact-match searches. Which indexing structure is generally appropriate?',
        options: ['B+ Tree index', 'Stack', 'Circular linked list', 'Queue'],
        correctOptionIndex: 0,
        correctAnswer: 'B+ Tree index',
        marks: 2,
        points: 2,
        order: 15,
      },
    ]);
    console.log(' Round 1: 15 updated MCQs created (2 marks each)');

    // ─── Round 2 Questions (Intermediate: 10 questions x 3 marks = 30 marks) ───
    await Question.deleteMany({ round: 2 });
    await Question.insertMany([
      {
        round: 2,
        questionType: 'output',
        title: '1. Recursion and Even Number Sum',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `static int fun(int[] a, int i) {\n    if(i == a.length)\n        return 0;\n    if(a[i] % 2 == 0)\n        return a[i] + fun(a, i + 1);\n    return fun(a, i + 1);\n}\n\nint[] a = {2, 5, 4, 7, 6};\nSystem.out.println(fun(a, 0));`,
        codeSnippetPython: `def fun(a, i):\n    if i == len(a):\n        return 0\n    if a[i] % 2 == 0:\n        return a[i] + fun(a, i + 1)\n    return fun(a, i + 1)\n\na = [2, 5, 4, 7, 6]\nprint(fun(a, 0))`,
        java: {
          code: `static int fun(int[] a, int i) {\n    if(i == a.length)\n        return 0;\n    if(a[i] % 2 == 0)\n        return a[i] + fun(a, i + 1);\n    return fun(a, i + 1);\n}\n\nint[] a = {2, 5, 4, 7, 6};\nSystem.out.println(fun(a, 0));`,
          answer: '12',
        },
        python: {
          code: `def fun(a, i):\n    if i == len(a):\n        return 0\n    if a[i] % 2 == 0:\n        return a[i] + fun(a, i + 1)\n    return fun(a, i + 1)\n\na = [2, 5, 4, 7, 6]\nprint(fun(a, 0))`,
          answer: '12',
        },
        correctOutput: '12',
        correctAnswer: '12',
        marks: 3,
        points: 3,
        order: 1,
      },
      {
        round: 2,
        questionType: 'output',
        title: '2. Stack Operations',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `Stack<Integer> st = new Stack<>();\n\nst.push(10);\nst.push(20);\nst.push(30);\n\nint x = st.pop();\nst.push(40);\n\nSystem.out.println(st.peek());\nSystem.out.println(x);`,
        codeSnippetPython: `st = []\n\nst.append(10)\nst.append(20)\nst.append(30)\n\nx = st.pop()\nst.append(40)\n\nprint(st[-1])\nprint(x)`,
        java: {
          code: `Stack<Integer> st = new Stack<>();\n\nst.push(10);\nst.push(20);\nst.push(30);\n\nint x = st.pop();\nst.push(40);\n\nSystem.out.println(st.peek());\nSystem.out.println(x);`,
          answer: '40\n30',
        },
        python: {
          code: `st = []\n\nst.append(10)\nst.append(20)\nst.append(30)\n\nx = st.pop()\nst.append(40)\n\nprint(st[-1])\nprint(x)`,
          answer: '40\n30',
        },
        correctOutput: '40\n30',
        correctAnswer: '40\n30',
        marks: 3,
        points: 3,
        order: 2,
      },
      {
        round: 2,
        questionType: 'output',
        title: '3. Variable Increment Tracing',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `int x = 5;\nSystem.out.println(x++ + ++x);`,
        codeSnippetPython: `x = 5\nprev_x = x\nx += 1\nx += 1\nprint(prev_x + x)`,
        java: {
          code: `int x = 5;\nSystem.out.println(x++ + ++x);`,
          answer: '12',
        },
        python: {
          code: `x = 5\nprev_x = x\nx += 1\nx += 1\nprint(prev_x + x)`,
          answer: '12',
        },
        correctOutput: '12',
        correctAnswer: '12',
        marks: 3,
        points: 3,
        order: 3,
      },
      {
        round: 2,
        questionType: 'output',
        title: '4. String Comparison',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `String a = "Java";\nString b = new String("Java");\n\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));`,
        codeSnippetPython: `a = "Java"\nb = "".join(["J", "a", "v", "a"])\n\nprint(a is b)\nprint(a == b)`,
        java: {
          code: `String a = "Java";\nString b = new String("Java");\n\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));`,
          answer: 'false\ntrue',
        },
        python: {
          code: `a = "Java"\nb = "".join(["J", "a", "v", "a"])\n\nprint(a is b)\nprint(a == b)`,
          answer: 'False\nTrue',
        },
        correctOutput: 'false\ntrue',
        correctAnswer: 'false\ntrue',
        marks: 3,
        points: 3,
        order: 4,
      },
      {
        round: 2,
        questionType: 'output',
        title: '5. Short-Circuit Evaluation',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `int x = 5;\n\nif(x++ > 5 && ++x > 6)\n    System.out.println(x);\nelse\n    System.out.println(x);`,
        codeSnippetPython: `x = 5\n\ncond1 = (x > 5)\nx += 1\n\nif cond1 and (x + 1 > 6):\n    print(x)\nelse:\n    print(x)`,
        java: {
          code: `int x = 5;\n\nif(x++ > 5 && ++x > 6)\n    System.out.println(x);\nelse\n    System.out.println(x);`,
          answer: '6',
        },
        python: {
          code: `x = 5\n\ncond1 = (x > 5)\nx += 1\n\nif cond1 and (x + 1 > 6):\n    print(x)\nelse:\n    print(x)`,
          answer: '6',
        },
        correctOutput: '6',
        correctAnswer: '6',
        marks: 3,
        points: 3,
        order: 5,
      },
      {
        round: 2,
        questionType: 'output',
        title: '6. String Manipulation',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `StringBuilder s = new StringBuilder("ABCDE");\n\ns.delete(1, 3);\ns.insert(1, "XY");\ns.reverse();\n\nSystem.out.println(s);`,
        codeSnippetPython: `s = list("ABCDE")\n\ndel s[1:3]\ns[1:1] = list("XY")\ns.reverse()\n\nprint("".join(s))`,
        java: {
          code: `StringBuilder s = new StringBuilder("ABCDE");\n\ns.delete(1, 3);\ns.insert(1, "XY");\ns.reverse();\n\nSystem.out.println(s);`,
          answer: 'EDYXA',
        },
        python: {
          code: `s = list("ABCDE")\n\ndel s[1:3]\ns[1:1] = list("XY")\ns.reverse()\n\nprint("".join(s))`,
          answer: 'EDYXA',
        },
        correctOutput: 'EDYXA',
        correctAnswer: 'EDYXA',
        marks: 3,
        points: 3,
        order: 6,
      },
      {
        round: 2,
        questionType: 'output',
        title: '7. Array/List Aliasing',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `int[] a = {1, 2, 3};\n\nint[] b = a;\n\nb[1] = 10;\n\na = new int[]{4, 5, 6};\n\nSystem.out.println(b[1]);\nSystem.out.println(a[1]);`,
        codeSnippetPython: `a = [1, 2, 3]\n\nb = a\n\nb[1] = 10\n\na = [4, 5, 6]\n\nprint(b[1])\nprint(a[1])`,
        java: {
          code: `int[] a = {1, 2, 3};\n\nint[] b = a;\n\nb[1] = 10;\n\na = new int[]{4, 5, 6};\n\nSystem.out.println(b[1]);\nSystem.out.println(a[1]);`,
          answer: '10\n5',
        },
        python: {
          code: `a = [1, 2, 3]\n\nb = a\n\nb[1] = 10\n\na = [4, 5, 6]\n\nprint(b[1])\nprint(a[1])`,
          answer: '10\n5',
        },
        correctOutput: '10\n5',
        correctAnswer: '10\n5',
        marks: 3,
        points: 3,
        order: 7,
      },
      {
        round: 2,
        questionType: 'output',
        title: '8. Bitwise Operators',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `public class Main {\n    public static void main(String[] args) {\n        int a = 12, b = 5;\n\n        int x = a ^ b & a | b;\n        int y = a << 1 ^ b >> 1;\n\n        System.out.println(x);\n        System.out.println(y);\n    }\n}`,
        codeSnippetPython: `a, b = 12, 5\n\nx = a ^ b & a | b\ny = a << 1 ^ b >> 1\n\nprint(x)\nprint(y)`,
        java: {
          code: `public class Main {\n    public static void main(String[] args) {\n        int a = 12, b = 5;\n\n        int x = a ^ b & a | b;\n        int y = a << 1 ^ b >> 1;\n\n        System.out.println(x);\n        System.out.println(y);\n    }\n}`,
          answer: '13\n26',
        },
        python: {
          code: `a, b = 12, 5\n\nx = a ^ b & a | b\ny = a << 1 ^ b >> 1\n\nprint(x)\nprint(y)`,
          answer: '13\n26',
        },
        correctOutput: '13\n26',
        correctAnswer: '13\n26',
        marks: 3,
        points: 3,
        order: 8,
      },
      {
        round: 2,
        questionType: 'output',
        title: '9. Two-Pointer Logic',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `int[] a = {1, 1, 2, 2, 3, 3, 4, 5};\nint target = 6;\n\nint l = 0;\nint r = a.length - 1;\nint count = 0;\n\nwhile(l < r) {\n    int sum = a[l] + a[r];\n    if(sum == target) {\n        count++;\n        l++;\n        r--;\n    }\n    else if(sum < target) {\n        l++;\n    }\n    else {\n        r--;\n    }\n}\n\nSystem.out.println(count);`,
        codeSnippetPython: `a = [1, 1, 2, 2, 3, 3, 4, 5]\ntarget = 6\n\nl = 0\nr = len(a) - 1\ncount = 0\n\nwhile l < r:\n    sum_val = a[l] + a[r]\n    if sum_val == target:\n        count += 1\n        l += 1\n        r -= 1\n    elif sum_val < target:\n        l += 1\n    else:\n        r -= 1\n\nprint(count)`,
        java: {
          code: `int[] a = {1, 1, 2, 2, 3, 3, 4, 5};\nint target = 6;\n\nint l = 0;\nint r = a.length - 1;\nint count = 0;\n\nwhile(l < r) {\n    int sum = a[l] + a[r];\n    if(sum == target) {\n        count++;\n        l++;\n        r--;\n    }\n    else if(sum < target) {\n        l++;\n    }\n    else {\n        r--;\n    }\n}\n\nSystem.out.println(count);`,
          answer: '3',
        },
        python: {
          code: `a = [1, 1, 2, 2, 3, 3, 4, 5]\ntarget = 6\n\nl = 0\nr = len(a) - 1\ncount = 0\n\nwhile l < r:\n    sum_val = a[l] + a[r]\n    if sum_val == target:\n        count += 1\n        l += 1\n        r -= 1\n    elif sum_val < target:\n        l += 1\n    else:\n        r -= 1\n\nprint(count)`,
          answer: '3',
        },
        correctOutput: '3',
        correctAnswer: '3',
        marks: 3,
        points: 3,
        order: 9,
      },
      {
        round: 2,
        questionType: 'output',
        title: '10. Harshad Number',
        questionText: 'Predict the output of the code below:',
        codeSnippet: `int n = 18;\n\nint temp = n;\nint s = 0;\n\nwhile(temp > 0) {\n    s += temp % 10;\n    temp /= 10;\n}\n\nif(n % s == 0) {\n    System.out.println("Harshad Number");\n} else {\n    System.out.println("Not Harshad Number");\n}`,
        codeSnippetPython: `n = 18\n\ntemp = n\ns = 0\n\nwhile temp > 0:\n    s += temp % 10\n    temp //= 10\n\nif n % s == 0:\n    print("Harshad Number")\nelse:\n    print("Not Harshad Number")`,
        java: {
          code: `int n = 18;\n\nint temp = n;\nint s = 0;\n\nwhile(temp > 0) {\n    s += temp % 10;\n    temp /= 10;\n}\n\nif(n % s == 0) {\n    System.out.println("Harshad Number");\n} else {\n    System.out.println("Not Harshad Number");\n}`,
          answer: 'Harshad Number',
        },
        python: {
          code: `n = 18\n\ntemp = n\ns = 0\n\nwhile temp > 0:\n    s += temp % 10\n    temp //= 10\n\nif n % s == 0:\n    print("Harshad Number")\nelse:\n    print("Not Harshad Number")`,
          answer: 'Harshad Number',
        },
        correctOutput: 'Harshad Number',
        correctAnswer: 'Harshad Number',
        marks: 3,
        points: 3,
        order: 10,
      },
    ]);
    console.log(' Round 2: 10 updated Output Finding questions created (3 marks each)');

    // ─── Round 3 Questions (Concept-Based Debugging: 10 questions x 5 marks = 50 marks) ───
    await Question.deleteMany({ round: 3 });
    await Question.insertMany([
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
    ]);
    console.log(' Round 3: 8 Concept-Based Debugging questions created (5 marks each)');

    await saveUserBackup();
    console.log('  Seeding complete!');
  } catch (err) {
    console.error('  Seed error:', err.message);
  }
};

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seed;
