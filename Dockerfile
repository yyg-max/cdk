FROM alpine:3.23

# set the time zone to Beijing Time in the Eastern 8th Time Zone
ARG TZ=Asia/Shanghai
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/${TZ} /etc/localtime && \
    echo "${TZ}" > /etc/timezone

WORKDIR /app

# set build arg for platform
ARG TARGETPLATFORM

# copy the appropriate binary based on platform
COPY cdk-server-${TARGETPLATFORM#linux/} ./cdk-server

# copy docs and support files
COPY docs ./docs
COPY support-files ./support-files

EXPOSE 8000

# set entrypoint
ENTRYPOINT ["./cdk-server"]
