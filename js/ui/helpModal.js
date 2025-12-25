// js/ui/helpModal.js

const HELP_CONTENT = {
    'distortion': {
        title: 'Distortion (失真) 效果器',
        content: `<p>失真效果會為聲音帶來沙啞、有力的顆粒感，常用於電吉他或電子貝斯。</p>
                  <ul>
                    <li><b>Wet (濕度):</b> 控制效果的乾濕混合比例 (0-1)。0 為原始聲音，1 為完全失真。</li>
                    <li><b>Amount (量):</b> 失真的程度，數值越高越沙啞。</li>
                    <li><b>Oversample (超取樣):</b> 減少高頻的數位雜訊，讓聲音更平滑。'4x' 的品質最好。</li>
                  </ul>`
    },
    'reverb': {
        title: 'Reverb (混響) 效果器',
        content: `<p>混響模擬聲音在不同空間（如房間、教堂）中的反射效果，為聲音增加空間感和深度。</p>
                  <ul>
                    <li><b>Wet (濕度):</b> 控制效果的乾濕混合比例 (0-1)。</li>
                    <li><b>Decay (衰減):</b> 混響的持續時間，模擬空間的大小。</li>
                    <li><b>Predelay (預延遲):</b> 原始聲音與第一個反射音之間的時間差，可增加聲音的清晰度。</li>
                  </ul>`
    },
    'feedbackDelay': {
        title: 'Feedback Delay (回饋延遲) 效果器',
        content: `<p>產生回音或延遲的效果，就像在山谷中呼喊一樣。</p>
                  <ul>
                    <li><b>Wet (濕度):</b> 控制效果的乾濕混合比例 (0-1)。</li>
                    <li><b>Delay Time (延遲時間):</b> 每次回音之間的間隔。可使用 "4n" (四分音符), "8n." (附點八分音符) 等音樂時值。</li>
                    <li><b>Feedback (回饋):</b> 回音的次數/強度。0.5 表示每次回音的音量都是上一次的一半。</li>
                  </ul>`
    },
    'filter': {
        title: 'Filter (濾波器)',
        content: `<p>濾波器可以切除或增強聲音的特定頻率部分，是塑造音色的核心工具。</p>
                  <ul>
                    <li><b>Type (類型):</b> <ul><li><b>lowpass:</b> 只讓低頻通過，常用來讓聲音變悶。</li><li><b>highpass:</b> 只讓高頻通過，常用來切除低頻雜訊。</li><li><b>bandpass:</b> 只讓一個特定頻段的聲音通過。</li></ul></li>
                    <li><b>Frequency (頻率):</b> 濾波器作用的中心頻率 (Hz)。</li>
                    <li><b>Q (共振):</b> 濾波器在中心頻率附近的銳利程度，數值越高聲音聽起來越「尖」。</li>
                    <li><b>Rolloff (滾降斜率):</b> 濾波器截止的陡峭程度，數值越低（如 -48）斜坡越陡，濾波效果越強烈。</li>
                  </ul>`
    },
    'compressor': {
        title: 'Compressor (壓縮器)',
        content: `<p><b>用途:</b> 藝術性地塑造聲音動態，讓聲音聽起來更平穩、有力。</p>
                  <p><b>比喻:</b> 像一個有彈性的「軟墊天花板」。當聲音太大頂到軟墊時，聲音還是會變大，只是沒有原本那麼多。</p>
                  <ul>
                    <li><b>Threshold (閾值):</b> 開始壓縮的音量水平(dB)，範圍約 -100 到 0。數值越低，越多聲音會被壓縮，平均音量聽起來可能更大。</li>
                    <li><b>Ratio (比率):</b> 壓縮比率。4 代表 4:1，表示訊號每超過閾值 4dB，輸出只會增加 1dB。</li>
                    <li><b>Attack (起始時間):</b> 聲音超過閾值後，壓縮器「反應過來」開始壓縮所需的時間 (秒)。</li>
                    <li><b>Release (釋放時間):</b> 聲音回到閾值以下後，壓縮器「放手」停止壓縮所需的時間 (秒)。</li>
                  </ul>`
    },
    'limiter': {
        title: 'Limiter (限幅器)',
        content: `<p><b>用途:</b> 保護性地防止聲音峰值超標，避免數位破音。</p>
                  <p><b>比喻:</b> 像一個堅硬的「鋼筋水泥天花板」。聲音一旦頂到就絕對無法再上去了。</p>
                  <ul>
                    <li><b>Threshold (閾值):</b> 不允許訊號超過的音量水平(dB)，最大值為 0，範圍約 -100 到 0。</li>
                  </ul>`
    }
};

let modalElement, titleElement, contentElement, closeButton;

export function initHelpModal() {
    modalElement = document.getElementById('helpModal');
    titleElement = document.getElementById('helpModalTitle');
    contentElement = document.getElementById('helpModalContent');
    closeButton = modalElement.querySelector('.modal-close-button');

    if (!modalElement || !titleElement || !contentElement || !closeButton) {
        console.error('Help modal elements not found!');
        return;
    }

    const closeModal = () => {
        modalElement.style.display = 'none';
    };

    closeButton.addEventListener('click', closeModal);
    modalElement.addEventListener('click', (event) => {
        // Close if backdrop is clicked, but not content
        if (event.target === modalElement) {
            closeModal();
        }
    });
}

export function showHelpModal(effectType) {
    if (!modalElement) {
        console.error('Help modal not initialized.');
        return;
    }

    const help = HELP_CONTENT[effectType];
    if (help) {
        titleElement.textContent = help.title;
        contentElement.innerHTML = help.content;
        modalElement.style.display = 'flex';
    } else {
        titleElement.textContent = '無說明';
        contentElement.innerHTML = `<p>找不到 <b>${effectType}</b> 的相關說明。</p>`;
        modalElement.style.display = 'flex';
    }
}
