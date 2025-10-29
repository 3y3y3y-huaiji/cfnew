import fetch from 'node-fetch';

fetch('http://127.0.0.1:8787')
  .then(res => res.text())
  .then(data => {
    console.log('Worker response length:', data.length);
    // 妫€鏌ュ搷搴旀槸鍚﹀寘鍚鏈熺殑鍐呭
    if (data.length > 0) {
      console.log('鉁?Worker is functioning correctly');
    } else {
      console.log('鉁?Worker response is empty');
    }
  })
  .catch(error => {
    console.error('Error testing worker:', error);
  });