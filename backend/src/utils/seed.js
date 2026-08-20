import bcrypt from 'bcryptjs';
import prisma from '../db.js';

async function main() {
  console.log('Seeding database...');

  // Clear existing data (in correct order of dependency)
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminPassword = await bcrypt.hash('adminpassword123', 10);
  const studentPassword = await bcrypt.hash('studentpassword123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@quiz.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'student@quiz.com',
      password: studentPassword,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  console.log('Created Users:', { admin: admin.email, student: student.email });

  // Create Categories
  const htmlCategory = await prisma.category.create({
    data: { name: 'HTML & CSS', description: 'HyperText Markup Language & Cascading Style Sheets' },
  });

  const jsCategory = await prisma.category.create({
    data: { name: 'JavaScript', description: 'Programming language for the Web' },
  });

  const reactCategory = await prisma.category.create({
    data: { name: 'React', description: 'UI library built by Meta' },
  });

  console.log('Created Categories');

  // Create Quiz 1: JavaScript Fundamentals
  const jsQuiz = await prisma.quiz.create({
    data: {
      title: 'JavaScript Fundamentals',
      description: 'Test your understanding of scopes, closures, variables, and asynchronous JS.',
      categoryId: jsCategory.id,
      difficulty: 'INTERMEDIATE',
      duration: 10, // 10 minutes
      passingScore: 60, // 60%
      maxAttempts: 3,
      status: 'PUBLISHED',
    },
  });

  // Questions for JavaScript Quiz
  const q1 = await prisma.question.create({
    data: {
      quizId: jsQuiz.id,
      questionText: 'Which keyword is used to declare a block-scoped variable that cannot be reassigned?',
      marks: 1.0,
      explanation: 'The const keyword declares a block-scoped constant variable whose value cannot be reassigned.',
      difficulty: 'EASY',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q1.id, optionText: 'var', isCorrect: false },
      { questionId: q1.id, optionText: 'let', isCorrect: false },
      { questionId: q1.id, optionText: 'const', isCorrect: true },
      { questionId: q1.id, optionText: 'static', isCorrect: false },
    ],
  });

  const q2 = await prisma.question.create({
    data: {
      quizId: jsQuiz.id,
      questionText: 'What is the output of: console.log(typeof null)?',
      marks: 1.0,
      explanation: 'In JavaScript, typeof null is historical error that returns "object".',
      difficulty: 'INTERMEDIATE',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q2.id, optionText: '"null"', isCorrect: false },
      { questionId: q2.id, optionText: '"undefined"', isCorrect: false },
      { questionId: q2.id, optionText: '"object"', isCorrect: true },
      { questionId: q2.id, optionText: '"string"', isCorrect: false },
    ],
  });

  const q3 = await prisma.question.create({
    data: {
      quizId: jsQuiz.id,
      questionText: 'Which method converts a JSON string into a JavaScript object?',
      marks: 1.0,
      explanation: 'JSON.parse() converts a JSON string into a JavaScript object.',
      difficulty: 'EASY',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q3.id, optionText: 'JSON.stringify()', isCorrect: false },
      { questionId: q3.id, optionText: 'JSON.parse()', isCorrect: true },
      { questionId: q3.id, optionText: 'JSON.convert()', isCorrect: false },
      { questionId: q3.id, optionText: 'JSON.object()', isCorrect: false },
    ],
  });

  const q4 = await prisma.question.create({
    data: {
      quizId: jsQuiz.id,
      questionText: 'Which of the following is NOT a JavaScript framework or library?',
      marks: 1.0,
      explanation: 'Django is a Python-based web framework, not a JavaScript framework/library.',
      difficulty: 'EASY',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q4.id, optionText: 'React', isCorrect: false },
      { questionId: q4.id, optionText: 'Vue', isCorrect: false },
      { questionId: q4.id, optionText: 'Angular', isCorrect: false },
      { questionId: q4.id, optionText: 'Django', isCorrect: true },
    ],
  });

  // Create Quiz 2: HTML5 & CSS3 Basics
  const cssQuiz = await prisma.quiz.create({
    data: {
      title: 'HTML5 & CSS3 Basics',
      description: 'Test your understanding of semantic HTML structure and basic CSS styling layout techniques.',
      categoryId: htmlCategory.id,
      difficulty: 'EASY',
      duration: 10,
      passingScore: 50,
      maxAttempts: 2,
      status: 'PUBLISHED',
    },
  });

  // Questions for HTML & CSS Quiz
  const q5 = await prisma.question.create({
    data: {
      quizId: cssQuiz.id,
      questionText: 'What does HTML stand for?',
      marks: 1.0,
      explanation: 'HTML stands for Hyper Text Markup Language.',
      difficulty: 'EASY',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q5.id, optionText: 'Hyper Text Markup Language', isCorrect: true },
      { questionId: q5.id, optionText: 'High Text Machine Language', isCorrect: false },
      { questionId: q5.id, optionText: 'Hyper Tool Multi Language', isCorrect: false },
      { questionId: q5.id, optionText: 'Home Tool Markup Language', isCorrect: false },
    ],
  });

  const q6 = await prisma.question.create({
    data: {
      quizId: cssQuiz.id,
      questionText: 'Which CSS property is used to change the background color of an element?',
      marks: 1.0,
      explanation: 'The background-color property sets the background color of an element.',
      difficulty: 'EASY',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q6.id, optionText: 'color', isCorrect: false },
      { questionId: q6.id, optionText: 'background-color', isCorrect: true },
      { questionId: q6.id, optionText: 'bgcolor', isCorrect: false },
      { questionId: q6.id, optionText: 'text-color', isCorrect: false },
    ],
  });

  // Create Quiz 3: React Hooks (Draft)
  const reactQuiz = await prisma.quiz.create({
    data: {
      title: 'React Hooks & State',
      description: 'Intermediate quiz on React hooks rules, useState, useEffect, and custom hooks.',
      categoryId: reactCategory.id,
      difficulty: 'HARD',
      duration: 15,
      passingScore: 70,
      maxAttempts: 2,
      status: 'DRAFT',
    },
  });

  const q7 = await prisma.question.create({
    data: {
      quizId: reactQuiz.id,
      questionText: 'Which hook should be used to memoize a computed value between renders?',
      marks: 1.0,
      explanation: 'useMemo returns a memoized value that only recomputes when dependencies change.',
      difficulty: 'INTERMEDIATE',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: q7.id, optionText: 'useCallback', isCorrect: false },
      { questionId: q7.id, optionText: 'useMemo', isCorrect: true },
      { questionId: q7.id, optionText: 'useEffect', isCorrect: false },
      { questionId: q7.id, optionText: 'useState', isCorrect: false },
    ],
  });

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
