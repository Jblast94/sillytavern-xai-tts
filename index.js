// xAI TTS Provider - Production-ready, follows current SillyTavern TTS template (2026)
class XaiTtsProvider {
    constructor() {
        this.settings = {
            apiKey: '',
            voiceId: 'Eve',
            language: 'en',
            enabled: false
        };

        this.voices = [
            { id: 'Eve', name: 'Eve - Energetic & upbeat' },
            { id: 'Ara', name: 'Ara - Warm & friendly' },
            { id: 'Leo', name: 'Leo - Authoritative & strong' },
            { id: 'Rex', name: 'Rex - Confident & clear' },
            { id: 'Sal', name: 'Sal - Smooth & balanced' }
        ];
    }

    // Required: Generate audio from text
    async generateTts(text, voiceId = null) {
        const voice = voiceId || this.settings.voiceId;

        if (!this.settings.enabled) throw new Error('xAI TTS is disabled');
        if (!this.settings.apiKey?.startsWith('xai-')) {
            toastr.error('xAI API key is missing or invalid');
            throw new Error('Invalid xAI API key');
        }
        if (!text?.trim()) throw new Error('No text provided for TTS');

        try {
            const response = await fetch('https://api.x.ai/v1/tts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text.trim(),
                    voice_id: voice,
                    language: this.settings.language,
                    output_format: {
                        codec: 'mp3',
                        sample_rate: 44100,
                        bit_rate: 128000
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error('xAI TTS error:', errorText);
                toastr.error(`xAI TTS failed (${response.status})`);
                throw new Error(`HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return new Blob([arrayBuffer], { type: 'audio/mpeg' });
        } catch (err) {
            console.error('xAI TTS generation failed:', err);
            toastr.error('Failed to generate xAI TTS audio');
            throw err;
        }
    }

    // Required: Return list of voices
    async fetchTtsVoiceObjects() {
        return this.voices;
    }

    // Required: Called when user clicks refresh voices
    onRefreshClick() {
        return Promise.resolve();
    }

    // Required: Check if provider is ready to use
    checkReady() {
        return this.settings.enabled && this.settings.apiKey?.startsWith('xai-');
    }

    // Required: Load settings from SillyTavern
    loadSettings(settings) {
        if (settings) {
            this.settings = { ...this.settings, ...settings };
        }
        return this.settings;
    }

    // Required: HTML for the extension settings panel
    get settingsHtml() {
        return `
            <div class="extension_block">
                <h3>xAI TTS</h3>
                <p><strong>Note:</strong> Your API key is stored only in the browser.</p>
                
                <label><input type="checkbox" id="xai_enabled"> Enable xAI TTS</label><br><br>
                
                <label>xAI API Key (starts with xai-)</label>
                <input type="password" id="xai_api_key" class="text_pole" placeholder="xai-..." style="width:100%"><br><br>
                
                <label>Default Voice</label>
                <select id="xai_voice" class="text_pole">
                    ${this.voices.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                </select><br><br>
                
                <label>Test Text</label>
                <textarea id="xai_test_text" class="text_pole" rows="3">Hello from xAI! This is [laugh] a test with speech tags.</textarea><br>
                <button id="xai_test_btn" class="menu_button">Test TTS</button>
                
                <small style="display:block; margin-top:15px; opacity:0.8;">
                    Speech tags are fully supported: [laugh], [pause], &lt;whisper&gt;text&lt;/whisper&gt;, &lt;loud&gt;, &lt;slow&gt;, &lt;sing-song&gt;, etc.
                </small>
            </div>`;
    }

    // Optional but useful: Preview a specific voice
    async previewTtsVoice(voiceId) {
        const testText = "Hello, this is a preview of this voice.";
        return this.generateTts(testText, voiceId);
    }
}

// Register the provider
const provider = new XaiTtsProvider();

jQuery(async () => {
    // Add settings UI
    $('#extensions_settings').append(provider.settingsHtml);

    // Load saved settings
    const saved = localStorage.getItem('xaiTtsSettings');
    if (saved) provider.loadSettings(JSON.parse(saved));

    // Bind form controls
    $('#xai_api_key').val(provider.settings.apiKey);
    $('#xai_voice').val(provider.settings.voiceId);
    $('#xai_enabled').prop('checked', provider.settings.enabled);

    $('#xai_api_key').on('input', () => {
        provider.settings.apiKey = $('#xai_api_key').val().trim();
        localStorage.setItem('xaiTtsSettings', JSON.stringify(provider.settings));
    });

    $('#xai_voice').on('change', () => {
        provider.settings.voiceId = $('#xai_voice').val();
        localStorage.setItem('xaiTtsSettings', JSON.stringify(provider.settings));
    });

    $('#xai_enabled').on('change', () => {
        provider.settings.enabled = $('#xai_enabled').is(':checked');
        localStorage.setItem('xaiTtsSettings', JSON.stringify(provider.settings));
    });

    $('#xai_test_btn').on('click', async () => {
        const text = $('#xai_test_text').val().trim() || 'Test successful!';
        try {
            const blob = await provider.generateTts(text);
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
        } catch (err) {
            // Errors already shown via toastr
        }
    });

    // Register with SillyTavern core
    if (typeof window.registerTtsProvider === 'function') {
        window.registerTtsProvider({
            id: 'xai',
            name: 'xAI',
            displayName: 'xAI TTS',
            provider: provider,
            enabled: () => provider.checkReady(),
            voices: provider.voices.map(v => v.id),
            getCurrentVoice: () => provider.settings.voiceId,
            setVoice: (voice) => { provider.settings.voiceId = voice; }
        });
        console.log('✅ xAI TTS provider registered successfully');
    } else {
        console.warn('⚠️ registerTtsProvider not found. Make sure the main TTS extension is enabled.');
    }

    console.log('✅ xAI TTS Extension v2.0.0 loaded');
});
