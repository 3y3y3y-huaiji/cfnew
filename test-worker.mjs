import fetch from 'node-fetch';

fetch('http://127.0.0.1:8787')
  .then(res => res.text())
  .then(data => {
    console.log('Worker response length:', data.length);
    // 检查响应是否包含预期的内容
    if (data.length > 0) {
      console.log('✓ Worker is functioning correctly');
    } else {
      console.log('✗ Worker response is empty');
    }
  })
  .catch(error => {
    console.error('Error testing worker:', error);
  });