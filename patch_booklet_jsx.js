const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');
const linesStr = src.split('\n');

const replace = `{(() => {
                        const tuitionPmts = payments.filter(p => !p.payment_type || p.payment_type === 'Tuition');
                        let bal = totalCharges;
                        const pRows = tuitionPmts.map((p, i) => {
                          const amt = Number(p.amount);
                          bal -= amt;
                          return (
                            <tr key={i} style={{ height: 25 }}>
                              <td style={{ textAlign: 'center', fontSize: 11 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('en-PH') : ''}</td>
                              <td style={{ textAlign: 'center', fontSize: 11 }}>{p.reference || ''}</td>
                              <td style={{ textAlign: 'right', fontSize: 11 }}>{amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td style={{ textAlign: 'right', fontSize: 11 }}>{bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td></td>
                            </tr>
                          );
                        });
                        const blanks = Array.from({ length: Math.max(0, 12 - pRows.length) }).map((_, i) => (
                          <tr key={\`b-\${i}\`} style={{ height: 25 }}><td></td><td></td><td></td><td></td><td></td></tr>
                        ));
                        return [...pRows, ...blanks];
                      })()}`;

const startIdx = linesStr.findIndex(l => l.includes('{Array.from({ length: 12 }).map((_, i) => ('));
if (startIdx !== -1) {
  linesStr.splice(startIdx, 5, replace);
  fs.writeFileSync('src/App.js', linesStr.join('\n'));
  console.log('Successfully replaced via line splicing');
} else {
  console.log('NOT FOUND!');
}
