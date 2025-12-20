#include "voip.h"
#include "iostream"
#include "portaudio.h"
#include <cstdint>
#include <ostream>
#include <sstream>
#include <string>
#include <thread>

#define SAMPLE_RATE (44100)
#define FRAMES_PER_BUFFER (512)
#define NUM_CHANNELS (1)

Voip *Voip::voip = nullptr;

Voip::Voip() { this->voip = this; }

void Voip::join(IP ip) {
  if (!callThread) {
    spawnThread();
  }
  connections.push_back(ip);
  std::cout << "joining voice\n";
}

void Voip::leave() {
  std::cout << "Attempting to Terminate Thread" << std::endl;
  while (!connections.empty()) {
    connections.pop_back();
  }
  terminateThread();
}

Voip::IP Voip::stoIP(std::string s) {
  IP ip;
  std::stringstream stream(s);
  uint8_t num;
  char _;
  for (int i = 0; i < 2; i++) {
    stream >> num;
    ip.push_back(num);
    stream >> _;
  }
  stream >> num;
  ip.push_back(num);
  return ip;
}

void Voip::terminateThread() {
  if (!callThread)
    return;
  killThread = true;
  callThread->join();
  if (callThread)
    delete callThread;
  callThread = nullptr;

  std::cout << "Thread Terminated Successfully" << std::endl;
};

void Voip::spawnThread() {
  callThread = new std::thread([this]() { this->processData(); });
}

void Voip::processData() {
  auto err = Pa_Initialize();
  if (err != paNoError) {
    std::cerr << "Error initializing Portaudio.";
  }

  PaStream *stream;

  err = Pa_OpenDefaultStream(
      &stream, 1,   /* no input channels */
      NUM_CHANNELS, /* stereo output */
      paFloat32,    /* 32 bit floating point output */
      SAMPLE_RATE, FRAMES_PER_BUFFER, micCallback,
      this); /* frames per buffer, i.e. the number
                               of sample frames that PortAudio will
                               request from the callback. Many apps
                               may want to use
                               paFramesPerBufferUnspecified, which
                               tells PortAudio to pick the best,
                               possibly changing, buffer size.*/

  if (err != paNoError)
    printf("PortAudio error: %s\n", Pa_GetErrorText(err));

  err = Pa_StartStream(stream);
  if (err != paNoError)
    printf("PortAudio error: %s\n", Pa_GetErrorText(err));

  float *soundBuf = new float[FRAMES_PER_BUFFER * 2];
  int i = 0;
  while (!killThread && i < 100000000) {
    Pa_Sleep(10);
    std::cout << "Listening..." << std::endl;
  }
  // Clear IP list
  Pa_StopStream(stream);
  Pa_CloseStream(stream);
  err = Pa_Terminate();
  if (err != paNoError)
    printf("PortAudio error: %s\n", Pa_GetErrorText(err));

  killThread = false;
}

int Voip::micCallback(const void *inputBuffer, void *outputBuffer,
                      unsigned long frameCount,
                      const PaStreamCallbackTimeInfo *timeInfo,
                      PaStreamCallbackFlags statusFlags, void *userData) {

  // Voip *voip = Voip::getVoip();
  float *in = (float *)inputBuffer;
  float *out = (float *)outputBuffer;
  for (unsigned long i = 0; i < frameCount; i++) {
    out[i] = in[i];
  }
  // Pa_WriteStream(userData, outputBuffer, frameCount);
  return PaStreamCallbackResult::paContinue;
}

std::thread *Voip::getThread() { return callThread; }