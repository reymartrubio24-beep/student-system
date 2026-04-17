const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');

src = src.replace(
  /acc\[r\.student_id\]\[r\.subject_id\] = \{\s*prelim1:\s*r\.prelim1,\s*prelim2:\s*r\.prelim2,\s*midterm:\s*r\.midterm,\s*semi_final:\s*r\.semi_final,\s*final:\s*r\.final,?\s*\};/g,
  `acc[r.student_id][r.subject_id] = {
            prelim1: r.prelim1,
            prelim2: r.prelim2,
            midterm: r.midterm,
            semi_final: r.semi_final,
            final: r.final,
            semester_id: r.semester_id,
          };`
);

fs.writeFileSync('src/App.js', src);
console.log('App.js global map patched');
