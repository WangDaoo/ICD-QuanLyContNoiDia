import { registerHooks } from 'node:module';

// Independent, test-only seam: append two consumer checks without editing root-owned source/tests.
registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  if (!url.endsWith('/audit/tools/tests/auth-recovery-view.test.mjs')) return result;
  return { ...result, source: String(result.source) + `
test('independent review: end-session controls give pending feedback during a deferred server logout',async()=>{
  let resolve;const pending=new Promise(done=>{resolve=done;});let calls=0;
  try {
    await withRecovery({logout:async()=>{calls++;await pending;}},async()=>{
      const choose=[...document.querySelectorAll('button')].find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
      await React.act(async()=>choose.click());
      assert.equal(calls,1);
      assert.ok(choose.disabled||document.querySelector('[role="status"]'),'outage logout must show pending feedback or disable its control');
      resolve();
    });
  } finally {resolve();}
});
test('independent review: rejected server logout must not emit an unhandled event rejection',async()=>{
  await withRecovery({logout:async()=>{throw new Error('Synthetic logout network failure');}},async()=>{
    const choose=[...document.querySelectorAll('button')].find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
    await React.act(async()=>choose.click());
    await new Promise(resolve=>setTimeout(resolve,20));
  });
});
test('independent review: same-batch account switch sends only one logout',async()=>{
  let resolve;const pending=new Promise(done=>{resolve=done;});let calls=0;
  try {
    await withRecovery({logout:async()=>{calls++;await pending;}},async()=>{
      const choose=[...document.querySelectorAll('button')].find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
      await React.act(async()=>{choose.click();choose.click();});
      assert.equal(calls,1,'pending account switch must synchronously reject a duplicate before React commits');
      resolve();
    });
  } finally {resolve();}
});
` };
} });
