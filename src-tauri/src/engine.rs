#[derive(Debug, Clone)]
pub struct SM2Result {
    pub repetitions: i32,
    pub interval: i32,
    pub ease_factor: f64,
}

pub fn sm2(quality: i32, repetitions: i32, interval: i32, ease_factor: f64) -> SM2Result {
    let mut reps = repetitions;
    let mut int = interval;
    let mut ease = ease_factor;

    if quality < 3 {
        reps = 0;
        int = 1;
    } else {
        if reps == 0 {
            int = 1;
        } else if reps == 1 {
            int = 6;
        } else {
            int = (int as f64 * ease).round() as i32;
        }
        reps += 1;
    }

    ease += 0.1 - (5 - quality) as f64 * (0.08 + (5 - quality) as f64 * 0.02);
    if ease < 1.3 {
        ease = 1.3;
    }

    SM2Result { repetitions: reps, interval: int, ease_factor: ease }
}

pub fn simple_rating(quality: i32, repetitions: i32, interval: i32, ease_factor: f64) -> SM2Result {
    let mapped = match quality {
        0 => 0,
        1 => 3,
        _ => 5,
    };
    sm2(mapped, repetitions, interval, ease_factor)
}
