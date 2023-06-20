// Based on https://gist.github.com/gre/1650294

var Easing = function(type, easeTime) {
    this.t = 0;
    this.type = type || "easeInOutCubic";
    this.magnitude = 1.70158;
    this.direction = 1;
    this.easeTime = easeTime || 1.0;
    this.running = false;
}

Easing.prototype.startEasing = function() {
    this.t = 0;
    this.running = true;
    this.direction = 1;
}

Easing.prototype.reverseEasing = function() {
    this.direction = -1;
    this.running = true;
}

Easing.prototype.update = function () {
    if (!this.running) return this.t;
    var dt = getDeltaTime();
    this.t = Math.max(Math.min(this.t + this.direction * dt/this.easeTime, 1.0), 0.0);
    
    if ((this.t == 1.0 && this.direction == 1) || (this.t == 0 && this.direction == -1)) this.running = false;
    return this[this.type]()
}

// No easing, no acceleration
Easing.prototype.linear = function() {
    return this.t;
}

// Slight acceleration from zero to full speed
Easing.prototype.easeInSine = function() {
    return -1 * Math.cos( this.t * ( Math.PI / 2 ) ) + 1;
}

// Slight deceleration at the end
Easing.prototype.easeOutSine = function() {
    return Math.sin( this.t * ( Math.PI / 2 ) );
}

// Slight acceleration at beginning and slight deceleration at end
Easing.prototype.easeInOutSine = function() {
    return -0.5 * ( Math.cos( Math.PI * this.t ) - 1 );
}

// Accelerating from zero velocity
Easing.prototype.easeInQuad = function() {
    return this.t * this.t;
}

// Decelerating to zero velocity
Easing.prototype.easeOutQuad = function() {
    return this.t * ( 2 - this.t );
}

// Acceleration until halfway, then deceleration
Easing.prototype.easeInOutQuad = function() {
    return this.t < 0.5 ? 2 * this.t * this.t : - 1 + ( 4 - 2 * this.t ) * this.t;
}

// Accelerating from zero velocity
Easing.prototype.easeInCubic = function() {
    return this.t * this.t * this.t;
}

// Decelerating to zero velocity
Easing.prototype.easeOutCubic = function() {
    const t1 = this.t - 1;
    return t1 * t1 * t1 + 1;
}

// Acceleration until halfway, then deceleration
Easing.prototype.easeInOutCubic = function() {
    return this.t < 0.5 ? 4 * this.t * this.t * this.t : ( this.t - 1 ) * ( 2 * this.t - 2 ) * ( 2 * this.t - 2 ) + 1;
}

// Accelerating from zero velocity
Easing.prototype.easeInQuart = function() {
    return this.t * this.t * this.t * this.t;
}

// Decelerating to zero velocity
Easing.prototype.easeOutQuart = function() {
    const t1 = this.t - 1;
    return 1 - t1 * t1 * t1 * t1;
}

// Acceleration until halfway, then deceleration
Easing.prototype.easeInOutQuart = function() {
    const t1 = this.t - 1;
    return this.t < 0.5 ? 8 * this.t * this.t * this.t * this.t : 1 - 8 * t1 * t1 * t1 * t1;
}

// Accelerating from zero velocity
Easing.prototype.easeInQuint = function() {
    return this.t * this.t * this.t * this.t * this.t;
}

// Decelerating to zero velocity
Easing.prototype.easeOutQuint = function() {
    const t1 = this.t - 1;
    return 1 + t1 * t1 * t1 * t1 * t1;
}

// Acceleration until halfway, then deceleration
Easing.prototype.easeInOutQuint = function() {
    const t1 = this.t - 1;
    return this.t < 0.5 ? 16 * this.t * this.t * this.t * this.t * this.t : 1 + 16 * t1 * t1 * t1 * t1 * t1;
}

// Accelerate exponentially until finish
Easing.prototype.easeInExpo = function() {

    if( this.t === 0 ) {
        return 0;
    }

    return Math.pow( 2, 10 * ( this.t - 1 ) );

}

// Initial exponential acceleration slowing to stop
Easing.prototype.easeOutExpo = function() {

    if( this.t === 1 ) {
        return 1;
    }

    return ( -Math.pow( 2, -10 * this.t ) + 1 );

}

// Exponential acceleration and deceleration
Easing.prototype.easeInOutExpo = function() {
    
    if( this.t === 0 || this.t === 1 ) {
        return this.t;
    }

    const scaledTime = this.t * 2;
    const scaledTime1 = scaledTime - 1;

    if( scaledTime < 1 ) {
        return 0.5 * Math.pow( 2, 10 * ( scaledTime1 ) );
    }

    return 0.5 * ( -Math.pow( 2, -10 * scaledTime1 ) + 2 );

}

// Increasing velocity until stop
Easing.prototype.easeInCirc = function() {

    const scaledTime = this.t / 1;
    return -1 * ( Math.sqrt( 1 - scaledTime * this.t ) - 1 );

}

// Start fast, decreasing velocity until stop
Easing.prototype.easeOutCirc = function() {

    const t1 = this.t - 1;
    return Math.sqrt( 1 - t1 * t1 );

}

// Fast increase in velocity, fast decrease in velocity
Easing.prototype.easeInOutCirc = function() {

    const scaledTime = this.t * 2;
    const scaledTime1 = scaledTime - 2;

    if( scaledTime < 1 ) {
        return -0.5 * ( Math.sqrt( 1 - scaledTime * scaledTime ) - 1 );
    }

    return 0.5 * ( Math.sqrt( 1 - scaledTime1 * scaledTime1 ) + 1 );

}

// Slow movement backwards then fast snap to finish
Easing.prototype.easeInBack = function() {

    return this.t * this.t * ( ( this.magnitude + 1 ) * this.t - this.magnitude );

}

// Fast snap to backwards point then slow resolve to finish
Easing.prototype.easeOutBack = function() {

    const scaledTime = ( this.t / 1 ) - 1;
    
    return (
        scaledTime * scaledTime * ( ( this.magnitude + 1 ) * scaledTime + this.magnitude )
    ) + 1;

}

// Slow movement backwards, fast snap to past finish, slow resolve to finish
Easing.prototype.easeInOutBack = function() {

    const scaledTime = this.t * 2;
    const scaledTime2 = scaledTime - 2;

    const s = this.magnitude * 1.525;

    if( scaledTime < 1) {

        return 0.5 * scaledTime * scaledTime * (
            ( ( s + 1 ) * scaledTime ) - s
        );

    }

    return 0.5 * (
        scaledTime2 * scaledTime2 * ( ( s + 1 ) * scaledTime2 + s ) + 2
    );

}
// Bounces slowly then quickly to finish
Easing.prototype.easeInElastic = function() {

    if( this.t === 0 || this.t === 1 ) {
        return this.t;
    }

    const scaledTime = this.t / 1;
    const scaledTime1 = scaledTime - 1;

    const p = 1 - this.magnitude;
    const s = p / ( 2 * Math.PI ) * Math.asin( 1 );

    return -(
        Math.pow( 2, 10 * scaledTime1 ) *
        Math.sin( ( scaledTime1 - s ) * ( 2 * Math.PI ) / p )
    );

}

// Fast acceleration, bounces to zero
Easing.prototype.easeOutElastic = function() {
    
    if( this.t === 0 || this.t === 1 ) {
        return this.t;
    }
    
    const p = 1 - this.magnitude;
    const scaledTime = this.t * 2;

    const s = p / ( 2 * Math.PI ) * Math.asin( 1 );
    return (
        Math.pow( 2, -10 * scaledTime ) *
        Math.sin( ( scaledTime - s ) * ( 2 * Math.PI ) / p )
    ) + 1;

}

// Slow start and end, two bounces sandwich a fast motion
Easing.prototype.easeInOutElastic = function() {

    if( this.t === 0 || this.t === 1 ) {
        return this.t;
    }

    const p = 1 - this.magnitude;
    const scaledTime = this.t * 2;
    const scaledTime1 = scaledTime - 1;
    
    const s = p / ( 2 * Math.PI ) * Math.asin( 1 );

    if( scaledTime < 1 ) {
        return -0.5 * (
            Math.pow( 2, 10 * scaledTime1 ) *
            Math.sin( ( scaledTime1 - s ) * ( 2 * Math.PI ) / p )
        );
    }

    return (
        Math.pow( 2, -10 * scaledTime1 ) *
        Math.sin( ( scaledTime1 - s ) * ( 2 * Math.PI ) / p ) * 0.5
    ) + 1;

}

// Bounce to completion
Easing.prototype.easeOutBounce = function() {

    const scaledTime = this.t / 1;

    if( scaledTime < ( 1 / 2.75 ) ) {

        return 7.5625 * scaledTime * scaledTime;

    } else if( scaledTime < ( 2 / 2.75 ) ) {

        const scaledTime2 = scaledTime - ( 1.5 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.75;

    } else if( scaledTime < ( 2.5 / 2.75 ) ) {

        const scaledTime2 = scaledTime - ( 2.25 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.9375;

    } else {

        const scaledTime2 = scaledTime - ( 2.625 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.984375;

    }

}

// Bounce increasing in velocity until completion
Easing.prototype.easeInBounce = function() {
    return 1 - easeOutBounce( 1 - this.t );
}

// Bounce in and bounce out
Easing.prototype.easeInOutBounce = function() {

    if( this.t < 0.5 ) {

        return easeInBounce( this.t * 2 ) * 0.5;
        
    }

    return ( easeOutBounce( ( this.t * 2 ) - 1 ) * 0.5 ) + 0.5;

}


module.exports = Easing;



