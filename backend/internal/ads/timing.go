package ads

import "time"

func ConversionTime(stage string, stored, clickedAt time.Time, messageAt *time.Time, now time.Time) time.Time {
	if stage == StageClick {
		return clickedAt
	}
	floor := clickedAt.Add(time.Second)
	t := stored
	if stage == StageAppointment && messageAt != nil {
		if m := messageAt.Add(time.Second); m.After(floor) {
			floor = m
		}
	}
	if t.Before(floor) {
		t = floor
	}
	if t.After(now) {
		t = now
	}
	return t
}
