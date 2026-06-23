document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const serverSelect = document.getElementById('serverSelect');
  
  // Template Select Elements
  const templateSelect = document.getElementById('templateSelect');
  const copyTemplateBtn = document.getElementById('copyTemplateBtn');
  const copySuccessMsg = document.getElementById('copySuccessMsg');

  const templates = {
    showcase: `Create a database-backed Student Project Showcase & Grading System application.

Database Structure:
Create a table called 'submissions' with the following columns:
- id (Primary Key, Auto-increment)
- student_name (Text, required)
- project_title (Text, required)
- project_description (Text)
- photo_file_name (Text - for uploading project photos)
- grade (Text/Integer - for teacher grading)
- feedback (Text - for teacher comments)
- grade_level (Text - dropdown selection for 6th, 7th, or 8th grade)
- team_members (Text - optional list of collaborators)
- submitted_at (Timestamp)

User Interface & Views:
Build a single-page app utilizing Tailwind CSS with a clean, modern dark mode layout (deep blue background with purple highlights) and glassmorphism cards. Include a tab navigation at the top to toggle between two views:
1. Student Submission Portal (Tab 1): Form for student name, title, collaborators, grade level, project photos, and description.
2. Teacher Grading Dashboard (Tab 2): Grid of student project cards, sorting/filtering tools, and an interactive review/grading feedback modal.`,

    reading: `Create a database-backed Daily Reading Log application for students.

Database Structure:
Create a table called 'reading_logs' with the following columns:
- id (Primary Key, Auto-increment)
- student_name (Text, required)
- book_title (Text, required)
- author (Text)
- pages_read (Integer, required)
- minutes_read (Integer, required)
- summary_or_reflection (Text, required)
- parent_signature_name (Text)
- submitted_at (Timestamp)

User Interface & Views:
Build a responsive single-page web app utilizing Tailwind CSS with a warm, education-friendly theme (soft green and slate). Include two tabs:
1. Log Entry Form (Tab 1): For students to log their daily reading stats, book details, reflection notes, and parent signature name.
2. Progress Dashboard (Tab 2): A view for the teacher or students to see total pages/minutes read, search entries by student name, and inspect book reflections.`,

    exit: `Create a database-backed Classroom Exit Ticket application to measure student understanding.

Database Structure:
Create a table called 'exit_tickets' with the following columns:
- id (Primary Key, Auto-increment)
- student_name (Text, required)
- class_period (Text - e.g. Period 1, Period 2)
- understanding_score (Integer - rating scale from 1 to 5)
- what_was_learned (Text, required)
- questions_or_confusions (Text)
- teacher_response (Text)
- submitted_at (Timestamp)

User Interface & Views:
Build a clean, responsive single-page web app using Tailwind CSS with an indigo and teal theme. Include tabs:
1. Submit Exit Ticket (Tab 1): A quick, distraction-free questionnaire for students to submit their learning status at the end of class.
2. Teacher Admin Panel (Tab 2): A tabular view sorting responses by Class Period, calculating the class's average understanding score, and allowing the teacher to write inline responses/comments to student questions.`,

    attendance: `Create a database-backed Class Attendance Tracker application.

Database Structure:
Create a table called 'attendance' with the following columns:
- id (Primary Key, Auto-increment)
- student_name (Text, required)
- attendance_date (Text, required - YYYY-MM-DD)
- status (Text - Present, Absent, Tardy)
- notes (Text - e.g. parent call, late pass reason)
- submitted_by (Text - teacher name)
- submitted_at (Timestamp)

User Interface & Views:
Build a professional single-page web app using Tailwind CSS with a slate and blue layout. Include tabs:
1. Attendance Form (Tab 1): An interface for teachers to select a date, view a student roster, and quickly set each student's status (Present/Absent/Tardy) with notes.
2. History Log & Stats (Tab 2): A dashboard displaying attendance records by date, with filters for status and search filters for student name, plus a summary card showing percentage attendance.`
  };

  // Handle template selection change
  templateSelect.addEventListener('change', () => {
    const selected = templateSelect.value;
    if (selected && templates[selected]) {
      copyTemplateBtn.disabled = false;
    } else {
      copyTemplateBtn.disabled = true;
    }
  });

  // Copy template text to clipboard
  copyTemplateBtn.addEventListener('click', () => {
    const selected = templateSelect.value;
    const promptText = templates[selected];
    if (promptText) {
      navigator.clipboard.writeText(promptText)
        .then(() => {
          copySuccessMsg.style.display = 'block';
          setTimeout(() => {
            copySuccessMsg.style.display = 'none';
          }, 2500);
        })
        .catch(err => {
          console.error('Failed to copy prompt:', err);
        });
    }
  });

  // Load saved server URL
  chrome.storage.local.get(['easyDataServerUrl'], (result) => {
    const savedUrl = result.easyDataServerUrl || 'https://easydata.is';
    serverSelect.value = savedUrl;
    checkServerStatus(savedUrl);
  });

  serverSelect.addEventListener('change', (e) => {
    const selectedUrl = e.target.value;
    chrome.storage.local.set({ easyDataServerUrl: selectedUrl }, () => {
      checkServerStatus(selectedUrl);
    });
  });

  function checkServerStatus(baseUrl) {
    statusDot.className = 'dot';
    statusText.innerText = 'Checking...';

    fetch(`${baseUrl}/health`)
      .then(res => {
        if (res.ok) {
          statusDot.className = 'dot online';
          statusText.innerText = 'Online';
        } else {
          statusDot.className = 'dot';
          statusText.innerText = 'Offline';
        }
      })
      .catch(() => {
        statusDot.className = 'dot';
        statusText.innerText = 'Offline';
      });
  }
});
