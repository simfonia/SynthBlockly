# How to Use the "Create Custom Sampler" Block

This block allows you to create a new musical instrument from your own audio samples.

## How It Works: The Principle of Resampling

This block is built on Tone.js's powerful `Sampler` instrument. Its core functionality relies on a technique called **digital audio resampling**.

*   **Single Sample**: If you provide only one audio sample (e.g., a recording of a C4 violin note), the sampler can generate a full range of pitches. When you ask it to play a higher note (like E4), it speeds up the sample's playback. When you ask for a lower note (like A3), it slows it down. This allows a single sound to cover the entire keyboard.

*   **Multiple Samples (Multisampling)**: For a more realistic and higher-quality sound, you can provide samples at different pitches (e.g., C4, G4, C5, G5...). This is called "multisampling." When you play a note, the sampler intelligently picks the closest original sample and resamples it just a small amount. This minimizes the audio degradation that can happen when pitching a single sample too far from its original state, resulting in a much more authentic-sounding instrument.

---

## Step 1: Find and Prepare Your Audio Samples

1.  **Find Samples**: Look for single-note audio files (e.g., `.wav`, `.mp3`) online. Websites like `Freesound.org` are a good resource. Search for terms like "violin C4", "piano samples", etc.
2.  **Check Licensing**: Ensure the audio files are licensed for free use (e.g., Public Domain, Creative Commons CC0).
3.  **Organize Files**: Collect the audio files you want to use.

## Step 2: Host Your Audio Files Online

To use the samples, they must be accessible via a public URL. A free and reliable way to do this is by using GitHub Pages.

1.  **Create a New GitHub Repository**:
    *   Go to GitHub and create a new **Public** repository (e.g., `my-synth-samples`).
    *   Initialize it with a `README.md` file.

2.  **Upload Your Files**:
    *   In your new repository, click `Add file` > `Upload files`.
    *   Drag and drop all your collected sample files into the upload area.
    *   Click `Commit changes`.

3.  **Enable GitHub Pages to Get the Base URL**:
    *   In the repository settings, go to the `Pages` tab.
    *   Under `Branch`, select `main` (or `master`) and click `Save`.
    *   After the page refreshes, a green box will appear with your site's URL. It will look like this:
        `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`
    *   **This is the Base URL for your sampler.**

## Step 3: Use the Block in SynthBlockly

Drag the "Create Custom Sampler" block from the `Samplers` category and fill in the fields:

*   **Name**: Give your instrument a name (e.g., `MyViolin`).
*   **Base URL**: Use a Text block to input the URL you got from GitHub Pages.
*   **Sample Map**: This is a JSON string that maps a musical note to its corresponding audio file.

    **Format**: `'{"NOTE_1": "file1.wav", "NOTE_2": "file2.mp3"}'`

    **Important**: The entire string must be wrapped in **single quotes** (`'`), while the keys (notes) and values (filenames) inside must use **double quotes** (`"`).

    **Example**:
    If your Base URL is `https://my-username.github.io/my-samples/` and you uploaded `violin-a4.wav` and `violin-c5.wav`, your Sample Map would be:
    `'{"A4": "violin-a4.wav", "C5": "violin-c5.wav"}'`

After running this block, you can use the `Select Current Instrument` block to switch to your newly created instrument and play it!
