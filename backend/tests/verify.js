const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING INTEGRATION TESTS ===');
  let studentToken = null;
  let adminToken = null;
  let jsQuizId = null;
  let attemptId = null;

  try {
    // 1. Test Admin Login
    console.log('Testing Admin Login...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@quiz.com',
        password: 'adminpassword123',
      }),
    });
    
    if (!adminLoginRes.ok) {
      console.log('❌ Admin Login failed.');
      process.exit(1);
    }
    
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;
    console.log('✔ Admin Login successful.');

    // 2. Test Student Login
    console.log('Testing Student Login...');
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@quiz.com',
        password: 'studentpassword123',
      }),
    });
    
    if (!studentLoginRes.ok) {
      console.log('❌ Student Login failed.');
      process.exit(1);
    }
    
    const studentLoginData = await studentLoginRes.json();
    studentToken = studentLoginData.token;
    console.log('✔ Student Login successful.');

    // 3. Test Role-Based Security: Student trying to access admin analytics
    console.log('Testing security: Student trying to access admin analytics...');
    const securityRes = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    
    if (securityRes.status === 403) {
      console.log('✔ Security test passed: Student access blocked with 403 Forbidden.');
    } else {
      console.log(`❌ Security test failed: Student was allowed or received status ${securityRes.status}`);
      process.exit(1);
    }

    // 4. Test Admin Analytics Access
    console.log('Testing Admin Analytics Access...');
    const analyticsRes = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (!analyticsRes.ok) {
      console.log('❌ Admin Analytics fetch failed.');
      process.exit(1);
    }
    
    const analyticsData = await analyticsRes.json();
    if (analyticsData.summary && analyticsData.summary.totalStudents === 1) {
      console.log('✔ Admin Analytics fetched correctly. Student count is 1.');
    } else {
      console.log('❌ Analytics verification failed. Data:', analyticsData);
      process.exit(1);
    }

    // 5. Test Fetching Quizzes (Student)
    console.log('Testing Quizzes List (Student)...');
    const quizzesRes = await fetch(`${BASE_URL}/quizzes`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    
    if (!quizzesRes.ok) {
      console.log('❌ Fetching quizzes failed.');
      process.exit(1);
    }
    
    const quizzes = await quizzesRes.json();
    const jsQuiz = quizzes.find(q => q.title === 'JavaScript Fundamentals');
    if (jsQuiz) {
      jsQuizId = jsQuiz.id;
      console.log(`✔ Found quiz: "${jsQuiz.title}" (ID: ${jsQuizId})`);
    } else {
      console.log('❌ Quiz not found in listing.');
      process.exit(1);
    }

    // 6. Test Start Quiz Attempt
    console.log('Testing Start Quiz Attempt...');
    const startRes = await fetch(`${BASE_URL}/quizzes/${jsQuizId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      }
    });
    
    if (!startRes.ok) {
      console.log('❌ Start attempt failed.');
      process.exit(1);
    }
    
    const startData = await startRes.json();
    attemptId = startData.attemptId;
    const attemptQuestions = startData.questions;
    console.log(`✔ Quiz attempt started. Attempt ID: ${attemptId}`);

    // Verify option security (student shouldn't get correct answer indicators)
    const hasCorrectFlag = attemptQuestions.some(q => q.options.some(o => o.hasOwnProperty('isCorrect')));
    if (!hasCorrectFlag) {
      console.log('✔ Option Security verified: "isCorrect" flags are hidden from student.');
    } else {
      console.log('❌ SECURITY HOLE: "isCorrect" option flags were leaked to student!');
      process.exit(1);
    }

    // 7. Test Submit Quiz Attempt with 100% correct answers
    console.log('Testing Submit Quiz Attempt (Calculating scores)...');
    
    // We fetch questions with correct answers using Admin token to map option IDs
    const adminQuestionsRes = await fetch(`${BASE_URL}/quizzes/${jsQuizId}/questions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (!adminQuestionsRes.ok) {
      console.log('❌ Fetching questions as admin failed.');
      process.exit(1);
    }
    
    const adminQuestions = await adminQuestionsRes.json();

    const answersPayload = adminQuestions.map(q => {
      const correctOption = q.options.find(o => o.isCorrect === true);
      return {
        questionId: q.id,
        selectedOptionId: correctOption.id,
      };
    });

    const submitRes = await fetch(`${BASE_URL}/quizzes/${jsQuizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        attemptId,
        answers: answersPayload,
      })
    });

    if (!submitRes.ok) {
      console.log('❌ Submit attempt failed.');
      process.exit(1);
    }

    const submitData = await submitRes.json();
    const attemptResult = submitData.attempt;
    if (attemptResult.percentage === 100 && attemptResult.status === 'PASSED') {
      console.log(`✔ Submit successful. Score: ${attemptResult.percentage}%, Status: ${attemptResult.status}`);
    } else {
      console.log('❌ Score calculation failed. Result details:', attemptResult);
      process.exit(1);
    }

    // 8. Test Attempt limit constraints
    console.log('Testing Attempt limits block...');
    
    // Attempt 2: Start
    const start2Res = await fetch(`${BASE_URL}/quizzes/${jsQuizId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      }
    });
    const start2Data = await start2Res.json();
    
    // Submit Attempt 2
    await fetch(`${BASE_URL}/quizzes/${jsQuizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        attemptId: start2Data.attemptId,
        answers: [],
      })
    });
    console.log('✔ Second attempt completed.');

    // Attempt 3: Start
    const start3Res = await fetch(`${BASE_URL}/quizzes/${jsQuizId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      }
    });
    const start3Data = await start3Res.json();
    
    // Submit Attempt 3
    await fetch(`${BASE_URL}/quizzes/${jsQuizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        attemptId: start3Data.attemptId,
        answers: [],
      })
    });
    console.log('✔ Third attempt completed.');

    // Attempt 4: Should fail because maxAttempts is 3
    const start4Res = await fetch(`${BASE_URL}/quizzes/${jsQuizId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      }
    });
    
    if (start4Res.status === 400) {
      console.log('✔ Limit check passed: Fourth attempt blocked with 400 Bad Request.');
    } else {
      console.log(`❌ Limit check failed: Attempt started with status ${start4Res.status}`);
      process.exit(1);
    }

    console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
