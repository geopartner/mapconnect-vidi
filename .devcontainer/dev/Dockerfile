FROM mapcentia/vidi:base18

RUN export DEBIAN_FRONTEND=noninteractive

# Copy workspace files
COPY . /root/vidi

# Install grunt
RUN cd ~/vidi && npm install grunt-cli -g --save-dev

# Install packages
RUN cd ~/vidi && npm install --legacy-peer-deps

EXPOSE 3000

# Share the source dir
VOLUME  ["/root/vidi"]