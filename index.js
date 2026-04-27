// xAI TTS - Stable version following current SillyTavern TTS extension patterns
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

    async generateTts(text, voiceId = null) {
        const voice = voiceId || this.settings.voiceId;
        if (!this.settings.enabled) throw new Error('xAI TTS disabled');
        if (!this.settings.apiKey?.startsWith('xai-')) {
            toastr.error('xAI API key is missing or invalid');
            throw new Error('Invalid API key');
        }
        if (!text?.trim()) throw new Error('No text provided');

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
                    output_format: { codec: 'mp3', sample_rate: 44100, bit_rate: 128000 }
                })
            });

            if (!response.ok) {
                const err = await response.text().catch(() => 'Unknown error');
                console.error('xAI API error:', err);
                toastr.error(`xAI TTS Error ${response.status}`);
                throw new Error(`HTTP ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            return new Blob([buffer], { type: 'audio/mpeg' });
        } catch (err) {
            console.error('generateTts failed:', err);
            toastr.error('xAI TTS generation failed');
            throw err;
        }
    }

    async fetchTtsVoiceObjects() {
        return this.voices.map(v => ({ id: v.id, name: v.name }));
    }

    onRefreshClick() {
        return Promise.resolve();
    }

    checkReady() {
        return this.settings.enabled && this.settings.apiKey?.startsWith('xai-');
    }

    loadSettings(settings) {
        if (settings) this.settings = { ...this.settings, ...settings };
        return this.settings;
    }

    async previewTtsVoice(voiceId) {
        return this.generateTts("Hello, this is a voice preview.", voiceId);
    }
}

const provider = new XaiTtsProvider();

$(() => {
    console.log('🚀 xAI TTS extension initializing...');

    $.get('./scripts/extensions/xai-tts/settings.html')
        .done(html => {
            $('#extensions_settings').append(html);

            const saved = localStorage.getItem('xaiTtsSettings');
            if (saved) provider.loadSettings(JSON.parse(saved));

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
                const text = $('#xai_test_text').val().trim() || 'Test from xAI TTS';
                try {
                    const blob = await provider.generateTts(text);
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    await audio.play();
                    audio.onended = () => URL.revokeObjectURL(url);
                } catch (e) {
                    console.error(e);
                }
            });

            if (typeof window.registerTtsProvider === 'function') {
                window.registerTtsProvider({
                    id: 'xai',
                    name: 'xAI',
                    displayName: 'xAI TTS',
                    provider: provider,
                    enabled: () => provider.checkReady(),
                    voices: provider.voices.map(v => v.id),
                    getCurrentVoice: () => provider.settings.voiceId,
                    setVoice: (v) => { provider.settings.voiceId = v; }
                });
                console.log('✅ xAI TTS provider successfully registered with core TTS');
            } else {
                console.warn('⚠️ registerTtsProvider not found yet. TTS extension may not be fully loaded.');
            }

            console.log('✅ xAI TTS Extension v2.1.0 loaded successfully');
        })
        .fail(err => {
            console.error('Failed to load settings.html:', err);
            toastr.error('xAI TTS: Could not load settings panel');
        });
});
