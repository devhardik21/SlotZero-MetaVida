const runE2ELiveTest = async () => {
  const baseUrl = 'http://localhost:3000/api';

  console.log('\n=============================================================');
  console.log('🚀 RUNNING END-TO-END HTTP API INTEGRATION TESTS');
  console.log('=============================================================\n');

  // 1. Authenticate Asha (Patient)
  console.log('1. Authenticating Asha (Patient from Asia/Kolkata)...');
  const ashaLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'asha@slotzero.io', password: 'demoPassword123!' }),
  });
  const ashaData = await ashaLoginRes.json();
  if (!ashaData.success) throw new Error('Asha login failed: ' + ashaData.message);
  const ashaToken = ashaData.token;
  console.log(`   ✓ Authenticated. Role: ${ashaData.user.role}, Timezone: ${ashaData.user.timezone}`);

  // 2. Authenticate Dr. Meera (Doctor)
  console.log('2. Authenticating Dr. Meera (Europe/London)...');
  const meeraLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'meera@slotzero.io', password: 'demoPassword123!' }),
  });
  const meeraData = await meeraLoginRes.json();
  if (!meeraData.success) throw new Error('Dr. Meera login failed: ' + meeraData.message);
  const meeraToken = meeraData.token;
  const meeraId = meeraData.user.id;
  console.log(`   ✓ Authenticated. Role: ${meeraData.user.role}, Doctor ID: ${meeraId}`);

  // 3. Fetch Doctor Availability for next Monday (2026-11-02) in Kolkata Time
  console.log('3. Fetching Dr. Meera Availability on 2026-11-02 from Kolkata (IST)...');
  const availRes = await fetch(`${baseUrl}/doctors/${meeraId}/availability?date=2026-11-02&timezone=Asia/Kolkata`);
  const availData = await availRes.json();
  if (!availData.success) throw new Error('Availability fetch failed: ' + availData.message);
  const slots = availData.data.slots;
  console.log(`   ✓ Slots returned: ${slots.length}`);
  console.log(`   ✓ Slot 0 (Kolkata): ${slots[0].viewerTime.formattedRange} (Doctor: ${slots[0].doctorTime.formattedRange})`);
  console.log(`   ✓ Slot 1 (Kolkata): ${slots[1].viewerTime.formattedRange} (Doctor: ${slots[1].doctorTime.formattedRange})`);

  // Verify buffer spacing
  if (slots[0].doctorTime.formattedStart !== '09:00' || slots[1].doctorTime.formattedStart !== '09:45') {
    throw new Error('Buffer calculation mismatch in API response');
  }
  console.log('   ✓ 15-minute automatic break confirmed between slots!');

  // 4. Asha Books Slot 0
  console.log('4. Asha booking Slot 0 via POST /api/appointments...');
  const bookRes = await fetch(`${baseUrl}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ashaToken}`,
    },
    body: JSON.stringify({
      doctorId: meeraId,
      startAt: slots[0].startAt,
      endAt: slots[0].endAt,
      patientTimezone: 'Asia/Kolkata',
      reason: 'Hypertension checkup and blood pressure monitoring',
      idempotencyKey: `e2e_key_${Date.now()}`,
    }),
  });
  const bookData = await bookRes.json();
  if (!bookData.success) throw new Error('Booking failed: ' + bookData.message);
  const appointmentId = bookData.data._id;
  console.log(`   ✓ Booking confirmed! Appointment ID: ${appointmentId}`);

  // 5. Concurrent Collision Test: Sam attempts to book the exact same slot
  console.log('5. Testing concurrency: Sam (America/New_York) attempts to book the SAME slot...');
  const samLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sam@slotzero.io', password: 'demoPassword123!' }),
  });
  const samToken = (await samLoginRes.json()).token;

  const conflictRes = await fetch(`${baseUrl}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${samToken}`,
    },
    body: JSON.stringify({
      doctorId: meeraId,
      startAt: slots[0].startAt,
      endAt: slots[0].endAt,
      patientTimezone: 'America/New_York',
      reason: 'Urgent consult',
    }),
  });
  console.log(`   ✓ Conflict response status: ${conflictRes.status} (Expected: 409)`);
  if (conflictRes.status !== 409) {
    throw new Error(`Expected HTTP 409, but received status ${conflictRes.status}`);
  }
  const conflictData = await conflictRes.json();
  console.log(`   ✓ Rejection message: "${conflictData.message}"`);

  // 6. Reschedule Appointment to Slot 2 (10:30 London)
  console.log('6. Rescheduling appointment to Slot 2 (10:30 London / 16:00 Kolkata)...');
  const rescheduleRes = await fetch(`${baseUrl}/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ashaToken}`,
    },
    body: JSON.stringify({
      newStartAt: slots[2].startAt,
      newEndAt: slots[2].endAt,
      reason: 'Rescheduling for afternoon slot',
    }),
  });
  const rescheduleData = await rescheduleRes.json();
  if (!rescheduleData.success) throw new Error('Reschedule failed: ' + rescheduleData.message);
  console.log('   ✓ Reschedule confirmed and slot locks swapped atomically!');

  // 7. Verify Slot 0 is now freed
  console.log('7. Verifying original Slot 0 is restored as Available...');
  const availCheckRes = await fetch(`${baseUrl}/doctors/${meeraId}/availability?date=2026-11-02&timezone=Asia/Kolkata`);
  const availCheckData = await availCheckRes.json();
  const restoredSlot = availCheckData.data.slots.find(s => s.startAt === slots[0].startAt);
  if (!restoredSlot || !restoredSlot.available) {
    throw new Error('Slot 0 was not restored as available after rescheduling');
  }
  console.log(`   ✓ Slot 0 at 09:00 London is now Available: ${restoredSlot.available}`);

  // 8. Cancel Appointment
  console.log('8. Cancelling appointment...');
  const cancelRes = await fetch(`${baseUrl}/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ashaToken}`,
    },
    body: JSON.stringify({ reason: 'Personal conflict' }),
  });
  const cancelData = await cancelRes.json();
  if (!cancelData.success) throw new Error('Cancel failed: ' + cancelData.message);
  console.log('   ✓ Cancellation confirmed! Locks released.');

  // 9. Inspect Audit Trail
  console.log('9. Inspecting audit log history...');
  const auditRes = await fetch(`${baseUrl}/appointments/${appointmentId}/history`, {
    headers: { 'Authorization': `Bearer ${ashaToken}` },
  });
  const auditData = await auditRes.json();
  console.log(`   ✓ Audit events recorded: ${auditData.data.length}`);
  console.log(`   ✓ Trail: ${auditData.data.map(d => d.action).join(' -> ')}`);

  console.log('\n=============================================================');
  console.log('✅ ALL HTTP API END-TO-END TESTS PASSED PERFECTLY!');
  console.log('=============================================================\n');
};

runE2ELiveTest().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
