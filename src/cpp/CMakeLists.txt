cmake_minimum_required(VERSION 3.16)
project(voip_engine LANGUAGES CXX)

# --- C++ standard ---
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- Export compile_commands.json for clangd ---
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# --- Warnings ---
add_compile_options(-Wall -Wextra)

# --- Optimization flags ---
# Release  -> -O3
# Debug    -> -g
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()

# --- PortAudio via pkg-config ---
find_package(PkgConfig REQUIRED)
pkg_check_modules(PORTAUDIO REQUIRED portaudio-2.0)

# --- Executable ---
add_executable(voip
  main.cpp
  voip.cpp
)

# --- Include dirs from pkg-config ---
target_include_directories(voip PRIVATE ${PORTAUDIO_INCLUDE_DIRS})

# --- Link dirs (needed on some platforms) ---
target_link_directories(voip PRIVATE ${PORTAUDIO_LIBRARY_DIRS})

# --- Link libraries ---
target_link_libraries(voip PRIVATE
  ${PORTAUDIO_LIBRARIES}
  pthread
)

# --- Extra compile flags from pkg-config ---
target_compile_options(voip PRIVATE ${PORTAUDIO_CFLAGS_OTHER})
