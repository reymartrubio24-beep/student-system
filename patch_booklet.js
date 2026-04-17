const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');

const target = `                    <tbody>
                      <tr>
                        <td colSpan="3"></td>
                        <td style={{ fontWeight: 'bold', fontSize: 14 }}>{totalCharges.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td></td>
                      </tr>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <tr key={\`e-\${i}\`} style={{height: 25}}>
                          <td></td><td></td><td></td><td></td><td></td>
                        </tr>
                      ))}
                    </tbody>`;

const replacement = `                    <tbody>
                      <tr>
                        <td colSpan="3"></td>
                        <td style={{ fontWeight: 'bold', fontSize: 14 }}>{totalCharges.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                        <td></td>
                      </tr>
                      {(() => {
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
                      })()}
                    </tbody>`;

if (src.includes(target)) {
  src = src.replace(target, replacement);
  fs.writeFileSync('src/App.js', src);
  console.log('SUCCESS: Updated booklet payment rows.');
} else {
  console.log('NOT FOUND - trying CRLF version...');
  // Try normalizing line endings
  const targetCRLF = target.replace(/\n/g, '\r\n');
  if (src.includes(targetCRLF)) {
    src = src.replace(targetCRLF, replacement);
    fs.writeFileSync('src/App.js', src);
    console.log('SUCCESS with CRLF: Updated booklet payment rows.');
  } else {
    console.log('STILL NOT FOUND - check manually');
    process.exit(1);
  }
}
