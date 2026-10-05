const { executeCode } = require('../utils/codeExecutor');

async function testJava() {
  const javaCode = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.hasNextInt() ? sc.nextInt() : 5;
        System.out.println("Java Output for N=" + n);
    }
}
`;

  console.log('Testing Java code execution with codeExecutor...');
  const res = await executeCode(javaCode, 'java', { input: '42' });
  console.log('Java execution result:');
  console.log('Success:', res.success);
  console.log('Output:', JSON.stringify(res.output));
  console.log('Error:', res.error);
  console.log('Execution Time:', res.executionTimeMs, 'ms');
}

testJava()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Java error:', err);
    process.exit(1);
  });
