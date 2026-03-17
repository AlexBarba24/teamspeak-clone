#include "voip.h"
#include "iostream"
#include "portaudio.h"
#include <netinet/in.h>
#include <sys/_types/_socklen_t.h>
#include <sys/socket.h>

#define SAMPLE_RATE (44100)
#define FRAMES_PER_BUFFER (512)
#define NUM_CHANNELS (1)

Voip *Voip::voip = nullptr;

Voip::Voip() {
  this->voip = this;
  bufferLen = 2 * FRAMES_PER_BUFFER;
}

void Voip::join(std::string ip) {
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

  // float *soundBuf = new float[FRAMES_PER_BUFFER * 2];
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

  Voip *voip = Voip::getVoip();
  float *in = (float *)inputBuffer;
  float *out = (float *)outputBuffer;
  for (unsigned long i = 0; i < frameCount * 2; i += 2) {
    voip->transmissionBuffer[i] = in[i];
    voip->transmissionBuffer[i + 1] = in[i];
    out[i] = voip->receptionBuffer[i];
    out[i + 1] = voip->receptionBuffer[i + 1];
  }
  for (auto &ip : voip->getConnections()) {
    if (inet_pton(AF_INET, ip.c_str(), &voip->server.sin_addr) <= 0) {
      perror("inet_pton");
      continue;
    }

    if (sendto(voip->sock, voip->transmissionBuffer,
               voip->bufferLen * sizeof(float), 0, (sockaddr *)&voip->server,
               sizeof(server)) < 0) {
      perror("sendto");
      continue;
    }
  }
  // Pa_WriteStream(userData, outputBuffer, frameCount);
  return PaStreamCallbackResult::paContinue;
}

int Voip::createSocket(int port) {
  sock = socket(AF_INET, SOCK_DGRAM, 0);
  if (sock < 0) {
    perror("socket");
    return 1;
  }
  struct timeval tv = {1, 0}; // 1 second
  setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
  server = {};
  server.sin_family = AF_INET;
  server.sin_port = htons(port);

  sockOpen = true;
  return 0;
}

void Voip::closeSocket() {
  close(sock);
  sockOpen = false;
  return;
}

void Voip::udpRecieve(int port) {
  float buffer[bufferLen];
  struct sockaddr_in from;
  socklen_t from_len = sizeof(from);
  while (sockOpen) {
    int n = recvfrom(sock, buffer, bufferLen * sizeof(float), 0,
                     (sockaddr *)&from, &from_len);
    if (n < 0)
      continue;
    bool flag = false;
    char strBuffer[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &from.sin_addr, strBuffer, sizeof(strBuffer));
    auto recIP = std::string(strBuffer);
    for (auto ip : connections) {
      if (!ip.compare(recIP))
        flag = true;
    }
    if (!flag)
      continue;
    receptionBuffer = buffer;
  }
}

std::thread *Voip::getThread() { return callThread; }