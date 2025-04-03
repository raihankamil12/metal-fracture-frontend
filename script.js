// script.js
let model;

// Load the Teachable Machine model
async function loadModel() {
  const loadingMessage = document.getElementById('loadingMessage');
  loadingMessage.style.display = 'block';
  const modelURL = 'https://teachablemachine.withgoogle.com/models/VC5_MnBPk/model.json';

  console.log("📦 Loading model from:", modelURL);
  model = await tf.loadLayersModel(modelURL);
  loadingMessage.style.display = 'none';
  console.log("✅ Model loaded");
}
loadModel();

document.getElementById('imageInput').addEventListener('change', handleImageUpload);

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (model) {
        const result = await classifyImage(img);
        const processedBlob = await preprocessImageWithCanny(canvas);
        if (processedBlob) {
          showProcessedImage(processedBlob);
          await requestAnalysisFromOpenAI(processedBlob, result);
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function classifyImage(image) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = "<h3>Output</h3>";
  const tensor = tf.browser.fromPixels(image).resizeNearestNeighbor([224, 224]).toFloat().div(255).expandDims(0);
  const predictions = await model.predict(tensor).data();
  const labels = ['Tensile', 'Bending', 'Torsional', 'Fatigue'];
  const result = labels.map((label, i) => ({ label, probability: predictions[i] }));

  result.forEach(r => {
    const percent = Math.round(r.probability * 100);
    const color = labelToColor(r.label);
    resultDiv.innerHTML += `
      <div style="text-align: left; font-size: 14px; font-weight: 500; margin-top: 10px;">
        ${r.label}
        <div style="background: #e0e0e0; border-radius: 10px; overflow: hidden; height: 14px;">
          <div style="width: ${percent}%; background: ${color}; height: 100%; text-align: right; padding-right: 4px; font-size: 12px; color: #fff;">
            ${percent}%
          </div>
        </div>
      </div>
    `;
  });

  return result;
}

function labelToColor(label) {
  switch (label) {
    case 'Tensile': return '#f39c12';
    case 'Bending': return '#e74c3c';
    case 'Torsional': return '#8e44ad';
    case 'Fatigue': return '#3498db';
    default: return '#95a5a6';
  }
}

function preprocessImageWithCanny(canvas) {
  return new Promise((resolve) => {
    if (typeof cv === 'undefined' || !cv.imread) {
      console.error("❌ OpenCV is not ready.");
      return resolve(null);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0);

    const src = cv.imread(tempCanvas);
    const gray = new cv.Mat();
    const edges = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.Canny(gray, edges, 50, 150);
    cv.cvtColor(edges, src, cv.COLOR_GRAY2RGBA);
    cv.imshow(tempCanvas, src);

    gray.delete();
    edges.delete();
    src.delete();

    tempCanvas.toBlob(resolve, 'image/png');
  });
}

function showProcessedImage(blob) {
  const url = URL.createObjectURL(blob);
  const processedImg = document.getElementById('processedImg');
  processedImg.src = url;
  processedImg.style.display = 'block';
  document.getElementById('analyzingText').style.display = 'block';
  document.getElementById('analysisBox').innerHTML = ''; // clear old analysis
}

async function requestAnalysisFromOpenAI(imageBlob, classification) {
  const formData = new FormData();
  formData.append('image', imageBlob, 'highlighted.png');
  formData.append('classification', JSON.stringify(classification));

  try {
    const response = await fetch('https://metal-fracture-backend.onrender.com/analyze-fracture', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to reach server');

    const data = await response.json();
    document.getElementById('analyzingText').style.display = 'none';
    document.getElementById('analysisBox').innerHTML = `<strong>🧾 Analysis:</strong><br>${data.analysis}`;
  } catch (err) {
    console.error("❌ Error talking to backend:", err);
    document.getElementById('analyzingText').style.display = 'none';
    document.getElementById('analysisBox').innerHTML = `<div style="color: red;">❌ Failed to contact analysis backend.</div>`;
  }
}
